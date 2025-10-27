// PHASE 1: The Camera View (The "Eye")

// 1. Import necessary components from React, React Native, and Expo
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  ScrollView,
  FlatList,
  TextInput
} from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { useLanguage } from '../contexts/LanguageContext';
import { t } from '../contexts/translations';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getFirestore, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { app, auth } from '../firebase.config';

// 2. Create a functional component named CameraScanner.
export default function CameraScanner({ navigation }) {
  // 3. Add state variables to manage camera permission, the camera reference, and the captured image URI.
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [scanResult, setScanResult] = useState('');
  const [captureMode, setCaptureMode] = useState('video'); // 'photo' or 'video' - default to video
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [cameraKey, setCameraKey] = useState(0); // Force camera remount
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [detectedItems, setDetectedItems] = useState(null); // Items pending review
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemCategory, setEditItemCategory] = useState('');
  const cameraRef = useRef(null);
  const fileInputRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const { language } = useLanguage(); // Get current language
  const db = getFirestore(app);

  const CLOUD_FUNCTION_URL = 'https://analyzeimage-awiyk42b4q-uc.a.run.app';
  const VIDEO_FRAME_SAMPLE_MS = [500, 2000, 4000, 6000, 8000];

  const convertUriToBase64 = async (uri) => {
    if (!uri) {
      throw new Error('No image URI provided');
    }

    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error('Failed to fetch image');
      }
      const blob = await response.blob();

      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const { result } = reader;
          if (typeof result !== 'string') {
            reject(new Error('Unexpected FileReader result type'));
            return;
          }
          const base64Data = result.split(',')[1];
          if (!base64Data) {
            reject(new Error('Failed to extract base64 data'));
            return;
          }
          resolve(base64Data);
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(blob);
      });
    }

    if (!FileSystem || !FileSystem.readAsStringAsync) {
      throw new Error('FileSystem module not available');
    }

    return await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
  };

  const analyzeImageBase64 = async (base64) => {
    if (!base64) {
      throw new Error('Failed to convert image to base64');
    }

    // Get authenticated user ID
    const userId = auth.currentUser?.uid;
    
    if (!userId) {
      throw new Error('No authenticated user found');
    }

    const response = await fetch(CLOUD_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: base64,
        language,
        userId, // Pass userId to Cloud Function
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Server error');
    }
    return result;
  };

  const analyzeImageFromUri = async (uri) => {
    const base64 = await convertUriToBase64(uri);
    return await analyzeImageBase64(base64);
  };

  const handleDetectionResult = (result, { silentNoItem = false } = {}) => {
    if (!result) {
      return false;
    }

    setScanResult(JSON.stringify(result, null, 2));

    if (result.saved && result.savedItems && result.savedItems.length > 0) {
      setDetectedItems({
        items: result.savedItems,
        expiryDate: result.expiryDate,
        detectionSource: result.detectionSource,
      });
      setShowReviewModal(true);
      return true;
    }

    if (result.expiryDate) {
      if (!silentNoItem) {
        Alert.alert(
          '📅 Date Found',
          `Expiry: ${result.expiryDate}\n\n⚠️ No food item recognized.\n\n💡 Try capturing the product label more clearly.`,
          [{ text: 'Retry', onPress: () => scanAgain() }]
        );
      }
      return false;
    }

    if (!silentNoItem) {
      Alert.alert(
        t('noItemsDetected', language),
        t('detectionTips', language),
        [
          { text: t('tryAgain', language), onPress: () => scanAgain() },
          { 
            text: t('addManually', language), 
            style: 'default',
            onPress: () => {
              scanAgain();
              navigation.navigate('Pantry', { screen: 'ManualEntry' });
            }
          },
        ]
      );
    }

    return false;
  };

  // 4. Request camera permissions when component loads
  useEffect(() => {
    if (Platform.OS !== 'web') {
      if (!permission) requestPermission();
      if (!micPermission) requestMicPermission();
    }
  }, [permission, micPermission]);

  // Reset camera when screen comes into focus (fixes black screen when returning from other tabs)
  useFocusEffect(
    useCallback(() => {
      // Force camera remount by changing key
      setCameraKey(prev => prev + 1);
      
      // Reset photo state when screen is focused
      setPhotoUri(null);
      setScanResult('');
      
      return () => {
        // Cleanup when leaving screen
        if (isRecording) {
          stopVideoRecording();
        }
        
        // Clean up blob URL if on web
        if (Platform.OS === 'web' && photoUri && photoUri.startsWith('blob:')) {
          URL.revokeObjectURL(photoUri);
        }
      };
    }, [isRecording, photoUri])
  );

  // 5. Write a function called 'takePicture' that will be called by a button.
  const takePicture = async () => {
    if (Platform.OS === 'web') {
      // On web, trigger file input (only if not already loading)
      if (!isLoading) {
        fileInputRef.current?.click();
      }
    } else if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
        });
        
        if (!photo || !photo.uri) {
          Alert.alert('Error', 'Failed to capture image');
          return;
        }
        
        setPhotoUri(photo.uri);
        // PHASE 2: Process the image after capture
        await processImage(photo.uri);
      } catch (error) {
        console.error('Camera error:', error);
        Alert.alert('Error', 'Failed to take picture: ' + error.message);
      }
    } else {
      Alert.alert('Error', 'Camera reference not available');
    }
  };

  // Handle file selection on web
  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      Alert.alert(t('error', language), 'Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      Alert.alert(t('error', language), 'Image file is too large. Maximum size is 10MB');
      return;
    }

    try {
      const uri = URL.createObjectURL(file);
      setPhotoUri(uri);
      await processImage(uri);
    } catch (error) {
      console.error('File selection error:', error);
      Alert.alert(t('error', language), 'Failed to load image: ' + error.message);
    } finally {
      // Reset file input so the same file can be selected again
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  // Toggle between photo and video mode
  const toggleCaptureMode = () => {
    if (isRecording) {
      Alert.alert('Recording in Progress', 'Please stop recording first.');
      return;
    }
    setCaptureMode(prev => prev === 'photo' ? 'video' : 'photo');
  };

  // Video recording functions - SIMPLE VERSION THAT WORKED
  const startVideoRecording = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Supported', 'Video recording is available on mobile only.');
      return;
    }

    if (!cameraRef.current) {
      Alert.alert('Error', 'Camera not available');
      return;
    }

    // Ensure camera is in video mode; if not, switch and remount
    if (captureMode !== 'video') {
      setCaptureMode('video');
      setCameraKey(prev => prev + 1);
      // wait a tick for remount
      await new Promise(r => setTimeout(r, 300));
    }

    // Mic permission: request if not granted; if denied, record muted
    let shouldMute = false;
    if (Platform.OS !== 'web') {
      try {
        const granted = micPermission?.granted ?? false;
        if (!granted) {
          const req = await requestMicPermission();
          if (!req?.granted) {
            shouldMute = true;
          }
        }
      } catch (_) {
        shouldMute = true;
      }
    }

    if (isRecording) {
      stopVideoRecording();
      return;
    }

    try {
      setIsRecording(true);
      setRecordingDuration(0);

      // Give camera a moment to be ready for video recording
      // (different from photo taking readiness)
      await new Promise(resolve => setTimeout(resolve, 300));

      // Start duration counter
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setRecordingDuration(elapsed);
        
        if (elapsed >= 10) {
          stopVideoRecording();
        }
      }, 100);

      recordingIntervalRef.current = interval;

      // Simple direct call - this worked before!
      const video = await cameraRef.current.recordAsync({
        maxDuration: 10,
        quality: '720p',
        mute: shouldMute,
      });

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }

      if (video && video.uri) {
        await processVideoRecording(video.uri);
      }

    } catch (error) {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      console.error('Video recording error:', error);
      Alert.alert('Recording Error', error.message);
    } finally {
      setIsRecording(false);
      setRecordingDuration(0);
    }
  };

  const stopVideoRecording = () => {
    console.log('⏹ Stopping video recording...');
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  // Process video recording - analyze multiple key frames for better accuracy
  const processVideoRecording = async (videoUri) => {
    setIsLoading(true);
    setScanResult('Processing video...');

    try {
      let detectionFound = false;

      for (let i = 0; i < VIDEO_FRAME_SAMPLE_MS.length; i++) {
        const sampleTime = VIDEO_FRAME_SAMPLE_MS[i];
        console.log(`📹 Extracting frame at ${sampleTime}ms from video:`, videoUri);

        const { uri: frameUri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
          time: sampleTime,
          quality: 0.8,
        });

        if (!frameUri) {
          continue;
        }

        if (i === 0) {
          setPhotoUri(frameUri);
        }

        const result = await analyzeImageFromUri(frameUri);
        const isFinalAttempt = i === VIDEO_FRAME_SAMPLE_MS.length - 1;
        const success = handleDetectionResult(result, { silentNoItem: !isFinalAttempt });

        if (success) {
          detectionFound = true;
          break;
        }
      }

      if (!detectionFound) {
        console.log('⚠️ No items detected in sampled frames');
      }
    } catch (error) {
      console.error('Video processing error:', error);
      Alert.alert(
        'Video Processing Error', 
        'Failed to process video frames. Please try again or use photo mode.',
        [{ text: 'OK', onPress: () => scanAgain() }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // PHASE 2: The Cloud Connection (The "Brain")
  
  // 2. Create a new async function called 'processImage'. It should take the photo's URI as an argument.
  const processImage = async (uri) => {
    setIsLoading(true);
    setScanResult('');

    try {
      const result = await analyzeImageFromUri(uri);
      handleDetectionResult(result);
    } catch (error) {
      console.error('Processing error:', error);
      Alert.alert(t('error', language), `${t('errorProcessing', language)}: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const scanAgain = () => {
    // Clean up blob URL if on web to prevent memory leaks
    if (Platform.OS === 'web' && photoUri && photoUri.startsWith('blob:')) {
      URL.revokeObjectURL(photoUri);
    }
    
    setPhotoUri(null);
    setScanResult('');
    setDetectedItems(null);
    setShowReviewModal(false);
  };

  const deleteDetectedItem = async (itemId) => {
    try {
      const userId = auth.currentUser?.uid;
      
      if (!userId) {
        Alert.alert('Error', 'No authenticated user found');
        return;
      }

      await deleteDoc(doc(db, `users/${userId}/pantry`, itemId));
      // Remove from local state
      setDetectedItems(prev => ({
        ...prev,
        items: prev.items.filter(item => item.id !== itemId)
      }));
    } catch (error) {
      console.error('Error deleting item:', error);
      Alert.alert('Error', 'Failed to delete item');
    }
  };

  const startEditItem = (item) => {
    setEditingItemId(item.id);
    setEditItemName(item.name);
    setEditItemCategory(item.category);
  };

  const saveEditItem = async () => {
    if (!editingItemId || !editItemName.trim()) {
      Alert.alert('Error', 'Item name cannot be empty');
      return;
    }

    try {
      const userId = auth.currentUser?.uid;
      
      if (!userId) {
        Alert.alert('Error', 'No authenticated user found');
        return;
      }

      const itemRef = doc(db, `users/${userId}/pantry`, editingItemId);
      await updateDoc(itemRef, {
        name: editItemName.trim(),
        itemName: editItemName.trim(),
        category: editItemCategory,
      });

      // Update local state
      setDetectedItems(prev => ({
        ...prev,
        items: prev.items.map(item =>
          item.id === editingItemId
            ? { ...item, name: editItemName.trim(), category: editItemCategory }
            : item
        )
      }));

      setEditingItemId(null);
      setEditItemName('');
      setEditItemCategory('');
    } catch (error) {
      console.error('Error updating item:', error);
      Alert.alert('Error', 'Failed to update item');
    }
  };

  const cancelEditItem = () => {
    setEditingItemId(null);
    setEditItemName('');
    setEditItemCategory('');
  };

  const confirmReview = () => {
    const remainingItems = detectedItems?.items.length || 0;
    
    // Close the review modal first
    setShowReviewModal(false);
    
    if (remainingItems === 0) {
      Alert.alert('All Items Removed', 'You removed all detected items. Scan again?');
      scanAgain();
    } else {
      // Small delay to ensure modal closes before alert shows
      setTimeout(() => {
        Alert.alert(
          '✅ Success!',
          `${remainingItems} item(s) added to your pantry!\n\n💡 Edit details in the Pantry tab`,
          [
            { text: 'Scan More', onPress: () => scanAgain() },
            { 
              text: 'View Pantry', 
              onPress: () => {
                scanAgain();
                navigation.navigate('Pantry');
              }
            }
          ]
        );
      }, 300);
    }
  };

  // 6. Add conditional rendering for the UI:
  if (!permission && Platform.OS !== 'web') {
    // If permission is null, show a "Requesting permission..." text.
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission?.granted && Platform.OS !== 'web') {
    // If permission is false, show a "No access to camera" text.
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No access to camera</Text>
        <Text style={styles.subText}>Please enable camera permissions in settings</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 9. Add another conditional render: If photoUri exists, display an Image component with the photo
  if (photoUri) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: photoUri }} style={styles.preview} />
        
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContent}>
              <ActivityIndicator size="large" color="#E53E3E" />
              <Text style={styles.loadingText}>🤖 Analyzing Image...</Text>
              <Text style={styles.loadingSubtext}>Detecting food items & expiry dates</Text>
            </View>
          </View>
        )}
        
        <TouchableOpacity 
          style={styles.scanAgainButton} 
          onPress={scanAgain}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>📷 Scan Again</Text>
        </TouchableOpacity>

        {/* Review Modal for photo mode */}
        <Modal
          visible={showReviewModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowReviewModal(false)}
        >
          <View style={styles.reviewModalOverlay}>
            <View style={styles.reviewModalContent}>
              <Text style={styles.reviewModalTitle}>{t('itemsDetected', language)}</Text>
              <Text style={styles.reviewModalSubtitle}>
                {t('reviewSubtitle', language)}
              </Text>

              <ScrollView style={styles.reviewItemsList}>
                {detectedItems?.items.map((item, index) => (
                  <View key={item.id} style={styles.reviewItem}>
                    {editingItemId === item.id ? (
                      // Edit mode
                      <View style={styles.editItemContainer}>
                        <TextInput
                          style={styles.editItemInput}
                          value={editItemName}
                          onChangeText={setEditItemName}
                          placeholder={t('itemName', language)}
                          autoFocus
                        />
                        <TextInput
                          style={styles.editItemInput}
                          value={editItemCategory}
                          onChangeText={setEditItemCategory}
                          placeholder={t('category', language)}
                        />
                        <View style={styles.editItemButtons}>
                          <TouchableOpacity
                            style={[styles.editItemButton, styles.editCancelButton]}
                            onPress={cancelEditItem}
                          >
                            <Text style={styles.editCancelButtonText}>{t('cancel', language)}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.editItemButton, styles.editSaveButton]}
                            onPress={saveEditItem}
                          >
                            <Text style={styles.editSaveButtonText}>{t('save', language)}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      // View mode
                      <>
                        <View style={styles.reviewItemInfo}>
                          <Text style={styles.reviewItemName}>{item.name}</Text>
                          <Text style={styles.reviewItemCategory}>{item.category}</Text>
                          {detectedItems.expiryDate && (
                            <Text style={styles.reviewItemExpiry}>
                              📅 {detectedItems.expiryDate}
                            </Text>
                          )}
                        </View>
                        <View style={styles.reviewItemActions}>
                          <TouchableOpacity
                            style={styles.reviewEditButton}
                            onPress={() => startEditItem(item)}
                          >
                            <Text style={styles.reviewEditButtonText}>✏️</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.reviewDeleteButton}
                            onPress={() => {
                              Alert.alert(
                                'Remove Item',
                                `Remove "${item.name}"?`,
                                [
                                  { text: 'Cancel', style: 'cancel' },
                                  { 
                                    text: 'Remove', 
                                    style: 'destructive',
                                    onPress: () => deleteDetectedItem(item.id)
                                  }
                                ]
                              );
                            }}
                          >
                            <Text style={styles.reviewDeleteButtonText}>🗑️</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </View>
                ))}
              </ScrollView>

              <View style={styles.reviewModalButtons}>
                <TouchableOpacity
                  style={[styles.reviewButton, styles.reviewCancelButton]}
                  onPress={() => {
                    Alert.alert(
                      t('discardAll', language),
                      t('discardAllMessage', language),
                      [
                        { text: t('cancel', language), style: 'cancel' },
                        {
                          text: t('discardAll', language),
                          style: 'destructive',
                          onPress: async () => {
                            // Delete all items
                            for (const item of detectedItems.items) {
                              await deleteDetectedItem(item.id);
                            }
                            scanAgain();
                          }
                        }
                      ]
                    );
                  }}
                >
                  <Text style={styles.reviewCancelButtonText}>{t('scanAgain', language)}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.reviewButton, styles.reviewConfirmButton]}
                  onPress={confirmReview}
                >
                  <Text style={styles.reviewConfirmButtonText}>
                    {t('confirm', language)} ({detectedItems?.items.length || 0})
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // 7. Configure the Camera component to fill the entire screen and set its ref to cameraRef.
  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? (
        // Web: Show upload interface
        <View style={styles.webContainer}>
          {isLoading ? (
            // Show loading overlay on web
            <View style={styles.webLoadingContainer}>
              <ActivityIndicator size="large" color="#E53E3E" />
              <Text style={styles.webLoadingText}>{t('analyzing', language)}</Text>
              <Text style={styles.webLoadingSubtext}>{t('detectingItems', language)}</Text>
            </View>
          ) : (
            <>
              <Text style={styles.webTitle}>{t('pantryAIScanner', language)}</Text>
              <Text style={styles.webSubtitle}>{t('uploadPhotoPrompt', language)}</Text>
              
              <TouchableOpacity 
                style={styles.uploadButton} 
                onPress={takePicture}
              >
                <Text style={styles.uploadButtonText}>📷 {t('choosePhoto', language)}</Text>
              </TouchableOpacity>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              
              <Text style={styles.webNote}>
                {t('bestResultsTip', language)}
              </Text>
            </>
          )}
        </View>
      ) : (
        // Mobile: Show camera view
        <>
          {/* Loading overlay for processing - show over camera */}
          {isLoading && !photoUri && (
            <View style={styles.loadingOverlay}>
              <View style={styles.loadingContent}>
                <ActivityIndicator size="large" color="#E53E3E" />
                <Text style={styles.loadingText}>
                  {captureMode === 'video' 
                    ? t('processingVideo', language)
                    : t('analyzing', language)}
                </Text>
                {captureMode === 'video' && (
                  <Text style={styles.loadingSubtext}>{t('extractingFrame', language)}</Text>
                )}
              </View>
            </View>
          )}
          
          <CameraView 
            key={`${cameraKey}-${captureMode}`}
            style={styles.camera} 
            facing="back"
            // Ensure camera is configured for the intended operation
            mode={captureMode === 'video' ? 'video' : 'picture'}
            ref={cameraRef}
          />
          {/* Overlay UI positioned absolutely over camera */}
          <View style={styles.cameraOverlay}>
            {/* Mode Toggle at top */}
            <View style={styles.topControls}>
              <TouchableOpacity 
                style={[styles.modeButton, captureMode === 'photo' && styles.modeButtonActive]}
                onPress={toggleCaptureMode}
                disabled={isRecording}
              >
                <View style={styles.modeButtonContent}>
                  <Ionicons 
                    name={captureMode === 'photo' ? 'camera-outline' : 'videocam-outline'} 
                    size={18} 
                    color="#fff" 
                    style={styles.modeIcon}
                  />
                  <Text style={styles.modeButtonText}>
                    {captureMode === 'photo' ? t('photoMode', language) : t('videoMode', language)}
                  </Text>
                </View>
              </TouchableOpacity>
              <Text style={styles.modeHint}>
                {captureMode === 'video' 
                  ? t('tapToRecord', language)
                  : t('tapToCapture', language)}
              </Text>
            </View>

            {/* Capture Button at bottom */}
            <View style={styles.buttonContainer}>
              {isRecording ? (
                <>
                  <TouchableOpacity 
                    style={styles.stopButtonOuter}
                    onPress={stopVideoRecording}
                  >
                    <View style={styles.stopButtonInner}>
                      {/* Small red square for stop */}
                    </View>
                  </TouchableOpacity>
                  <View style={styles.recordingInfo}>
                    <View style={styles.recordingRow}>
                      <MaterialCommunityIcons name="record-circle" size={18} color="#FF3B30" style={styles.recordDot} />
                      <Text style={styles.recordingText}>
                        {t('recording', language)} {recordingDuration}s / 10s
                      </Text>
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <TouchableOpacity 
                    style={[
                      styles.captureButton,
                      captureMode === 'video' && styles.videoCaptureButton
                    ]} 
                    onPress={captureMode === 'photo' ? takePicture : startVideoRecording}
                  >
                    <View style={[
                      styles.captureButtonInner,
                      captureMode === 'video' && styles.videoButtonInner
                    ]}>
                      {/* Empty - icon removed per user preference */}
                    </View>
                  </TouchableOpacity>
                  <Text style={styles.captureHint}>
                    {captureMode === 'video' 
                      ? t('tapToRecord', language)
                      : t('tapToCapture', language)}
                  </Text>
                </>
              )}
            </View>
          </View>
        </>
      )}

      {/* Review Modal for detected items */}
      <Modal
        visible={showReviewModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReviewModal(false)}
      >
        <View style={styles.reviewModalOverlay}>
          <View style={styles.reviewModalContent}>
            <Text style={styles.reviewModalTitle}>{t('itemsDetected', language)}</Text>
            <Text style={styles.reviewModalSubtitle}>
              {t('reviewSubtitle', language)}
            </Text>

            <ScrollView style={styles.reviewItemsList}>
              {detectedItems?.items.map((item, index) => (
                <View key={item.id} style={styles.reviewItem}>
                  {editingItemId === item.id ? (
                    // Edit mode
                    <View style={styles.editItemContainer}>
                      <TextInput
                        style={styles.editItemInput}
                        value={editItemName}
                        onChangeText={setEditItemName}
                        placeholder={t('itemName', language)}
                        autoFocus
                      />
                      <TextInput
                        style={styles.editItemInput}
                        value={editItemCategory}
                        onChangeText={setEditItemCategory}
                        placeholder={t('category', language)}
                      />
                      <View style={styles.editItemButtons}>
                        <TouchableOpacity
                          style={[styles.editItemButton, styles.editCancelButton]}
                          onPress={cancelEditItem}
                        >
                          <Text style={styles.editCancelButtonText}>{t('cancel', language)}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.editItemButton, styles.editSaveButton]}
                          onPress={saveEditItem}
                        >
                          <Text style={styles.editSaveButtonText}>{t('save', language)}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    // View mode
                    <>
                      <View style={styles.reviewItemInfo}>
                        <Text style={styles.reviewItemName}>{item.name}</Text>
                        <Text style={styles.reviewItemCategory}>{item.category}</Text>
                        {detectedItems.expiryDate && (
                          <Text style={styles.reviewItemExpiry}>
                            📅 {detectedItems.expiryDate}
                          </Text>
                        )}
                      </View>
                      <View style={styles.reviewItemActions}>
                        <TouchableOpacity
                          style={styles.reviewEditButton}
                          onPress={() => startEditItem(item)}
                        >
                          <Text style={styles.reviewEditButtonText}>✏️</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.reviewDeleteButton}
                          onPress={() => {
                            Alert.alert(
                              'Remove Item',
                              `Remove "${item.name}"?`,
                              [
                                { text: 'Cancel', style: 'cancel' },
                                { 
                                  text: 'Remove', 
                                  style: 'destructive',
                                  onPress: () => deleteDetectedItem(item.id)
                                }
                              ]
                            );
                          }}
                        >
                          <Text style={styles.reviewDeleteButtonText}>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              ))}
            </ScrollView>

            <View style={styles.reviewModalButtons}>
              <TouchableOpacity
                style={[styles.reviewButton, styles.reviewCancelButton]}
                onPress={() => {
                  Alert.alert(
                    t('discardAll', language),
                    t('discardAllMessage', language),
                    [
                      { text: t('cancel', language), style: 'cancel' },
                      {
                        text: t('discardAll', language),
                        style: 'destructive',
                        onPress: async () => {
                          // Delete all items
                          for (const item of detectedItems.items) {
                            await deleteDetectedItem(item.id);
                          }
                          scanAgain();
                        }
                      }
                    ]
                  );
                }}
              >
                <Text style={styles.reviewCancelButtonText}>{t('scanAgain', language)}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.reviewButton, styles.reviewConfirmButton]}
                onPress={confirmReview}
              >
                <Text style={styles.reviewConfirmButtonText}>
                  {t('confirm', language)} ({detectedItems?.items.length || 0})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  webTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#E53E3E',
    marginBottom: 10,
  },
  webSubtitle: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 40,
    maxWidth: 400,
  },
  uploadButton: {
    backgroundColor: '#DD6B20',
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 30,
    marginBottom: 20,
    shadowColor: '#DD6B20',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  webNote: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
  webLoadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  webLoadingText: {
    fontSize: 20,
    color: '#E53E3E',
    marginTop: 20,
    fontWeight: 'bold',
  },
  webLoadingSubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 10,
    textAlign: 'center',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    pointerEvents: 'box-none',
  },
  topControls: {
    marginTop: 60,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignSelf: 'center',
  },
  modeButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  modeButtonActive: {
    backgroundColor: '#E53E3E',
    borderColor: '#E53E3E',
  },
  modeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modeIcon: {
    marginRight: 8,
  },
  modeHint: {
    color: '#fff',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.9,
  },
  cameraReadyHint: {
    color: '#FFA500',
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  buttonContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.5,
  },
  videoCaptureButton: {
    backgroundColor: '#FF0000',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E53E3E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoButtonInner: {
    width: 50,
    height: 50,
    backgroundColor: '#FF3B30',
    borderRadius: 25,
  },
  stopButtonOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopButtonInner: {
    width: 35,
    height: 35,
    backgroundColor: '#FF3B30',
    borderRadius: 6,
  },
  recordingInfo: {
    marginTop: 15,
    alignItems: 'center',
  },
  captureHint: {
    color: '#fff',
    fontSize: 14,
    marginTop: 15,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  recordingIndicator: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.9)',
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#FF0000',
  },
  recordingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordDot: {
    marginRight: 8,
  },
  recordingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stopButton: {
    backgroundColor: '#FF0000',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#fff',
  },
  stopButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  preview: {
    flex: 1,
    resizeMode: 'contain',
  },
  scanAgainButton: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: '#DD6B20',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  text: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
  },
  subText: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    marginTop: 10,
  },
  button: {
    marginTop: 20,
    backgroundColor: '#DD6B20',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    alignSelf: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  loadingContent: {
    alignItems: 'center',
    backgroundColor: 'rgba(229, 62, 62, 0.2)',
    padding: 30,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E53E3E',
  },
  loadingText: {
    color: '#fff',
    marginTop: 15,
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingSubtext: {
    color: '#ccc',
    marginTop: 5,
    fontSize: 14,
    textAlign: 'center',
  },
  resultContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 15,
    borderRadius: 10,
  },
  resultText: {
    color: '#E53E3E',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  resultData: {
    color: '#fff',
    fontSize: 12,
  },
  reviewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  reviewModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 25,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  reviewModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E53E3E',
    marginBottom: 5,
    textAlign: 'center',
  },
  reviewModalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  reviewItemsList: {
    maxHeight: 400,
    marginBottom: 20,
  },
  reviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#E53E3E',
  },
  reviewItemInfo: {
    flex: 1,
    marginRight: 10,
  },
  reviewItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  reviewItemCategory: {
    fontSize: 13,
    color: '#E53E3E',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 3,
  },
  reviewItemExpiry: {
    fontSize: 12,
    color: '#666',
  },
  reviewItemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  reviewEditButton: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  reviewEditButtonText: {
    fontSize: 20,
  },
  reviewDeleteButton: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  reviewDeleteButtonText: {
    fontSize: 20,
  },
  editItemContainer: {
    flex: 1,
    gap: 10,
  },
  editItemInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  editItemButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 5,
  },
  editItemButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  editCancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  editCancelButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  editSaveButton: {
    backgroundColor: '#DD6B20',
  },
  editSaveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  reviewModalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  reviewButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  reviewCancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  reviewCancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  reviewConfirmButton: {
    backgroundColor: '#DD6B20',
    shadowColor: '#DD6B20',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  reviewConfirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});


