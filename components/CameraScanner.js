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
  TextInput,
  AppState,
  KeyboardAvoidingView
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { useLanguage } from '../contexts/LanguageContext';
import { t } from '../contexts/translations';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getFirestore, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { app, auth } from '../firebase.config';
import { getUserUsage } from '../utils/usageTracking';
import { parseDate, formatDate } from '../utils/dateHelpers';
import { CATEGORIES, UNITS, CATEGORY_KEY_MAP, normalizeCategory } from '../utils/constants';
import { config } from '../config';

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
  const [editItemQuantity, setEditItemQuantity] = useState('1');
  const [editItemUnit, setEditItemUnit] = useState('pcs');
  const [editItemExpiryDate, setEditItemExpiryDate] = useState(new Date());
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [usageData, setUsageData] = useState(null);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [processingMode, setProcessingMode] = useState('photo'); // 'photo' or 'video'
  const [torchEnabled, setTorchEnabled] = useState(false);
  const cameraRef = useRef(null);
  const fileInputRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const isRecordingRef = useRef(false);
  const latestPhotoUriRef = useRef(null);
  const isCameraReadyRef = useRef(false);
  const cameraReadyTimestampRef = useRef(0);
  const lastToggleTime = useRef(0);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const cameraReadyResolvers = useRef([]);
  const editScrollViewRef = useRef(null);
  const { language } = useLanguage(); // Get current language
  const isFocused = useIsFocused();
  const db = getFirestore(app);
  
  // Auto-scroll to date picker when opened
  useEffect(() => {
    if (showEditDatePicker && editScrollViewRef.current) {
      setTimeout(() => {
        editScrollViewRef.current.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [showEditDatePicker]);

  // Battery Optimization: Track AppState to disable camera when in background
  const appState = useRef(AppState.currentState);
  const [isAppActive, setIsAppActive] = useState(appState.current === 'active');

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('App has come to the foreground!');
        setIsAppActive(true);
      } else if (nextAppState.match(/inactive|background/)) {
        console.log('App has gone to the background!');
        setIsAppActive(false);
        // Turn off torch to save battery
        setTorchEnabled(false);
        // Stop recording if active
        if (isRecordingRef.current) {
          stopVideoRecording(true);
        }
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const CAMERA_READY_BUFFER_MS = Platform.OS === 'android' ? 500 : 0; // More buffer for Android

  const handleCameraReady = useCallback(() => {
    console.log('[LIFECYCLE] onCameraReady fired.');
    isCameraReadyRef.current = true;
    cameraReadyTimestampRef.current = Date.now();
    setIsCameraReady(true);
    if (cameraReadyResolvers.current.length > 0) {
      console.log('[LIFECYCLE] Resolving pending camera-ready promises.');
      cameraReadyResolvers.current.forEach(resolve => resolve());
      cameraReadyResolvers.current = [];
    }
  }, []);

  const waitForCameraReady = useCallback(() => {
    if (isCameraReadyRef.current) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Camera ready timeout - camera did not initialize within 5 seconds'));
      }, 5000);
      
      const wrappedResolve = () => {
        clearTimeout(timeout);
        resolve();
      };
      
      cameraReadyResolvers.current.push(wrappedResolve);
    });
  }, []);

  const resetCameraReadyState = useCallback(() => {
    console.log('[LIFECYCLE] Resetting camera ready state.');
    isCameraReadyRef.current = false;
    setIsCameraReady(false);
  }, []);

  // Auto-recovery for camera initialization
  useEffect(() => {
    let timeout;
    // If focused, not ready, and not showing a photo/loading
    if (isFocused && !isCameraReady && !photoUri && !isLoading) {
      timeout = setTimeout(() => {
        console.log('[RECOVERY] Camera initialization timed out. Remounting...');
        setCameraKey(prev => prev + 1);
      }, 3000); // Retry after 3 seconds if not ready
    }
    return () => clearTimeout(timeout);
  }, [isFocused, isCameraReady, photoUri, isLoading, cameraKey]);

  const waitForStableCamera = useCallback(async () => {
    await waitForCameraReady();
    const elapsed = Date.now() - cameraReadyTimestampRef.current;
    if (elapsed < CAMERA_READY_BUFFER_MS) {
      await new Promise(resolve => setTimeout(resolve, CAMERA_READY_BUFFER_MS - elapsed));
    }
  }, [waitForCameraReady]);

  // Load usage data on mount and when user changes
  useEffect(() => {
    if (auth.currentUser) {
      loadUsageData(auth.currentUser.uid);
    }
  }, [auth.currentUser?.uid]);

  // Reload usage data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (auth.currentUser) {
        loadUsageData(auth.currentUser.uid);
      }
    }, [])
  );

  const loadUsageData = async (userId) => {
    try {
      setLoadingUsage(true);
      const usage = await getUserUsage(userId);
      setUsageData(usage);
    } catch (error) {
      console.error('Error loading usage data:', error);
    } finally {
      setLoadingUsage(false);
    }
  };

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

  const analyzeImageBase64 = async (base64, mimeType = 'image/jpeg') => {
    if (!base64) {
      throw new Error('Failed to convert image to base64');
    }

    // Get authenticated user ID
    const userId = auth.currentUser?.uid;
    
    if (!userId) {
      throw new Error('No authenticated user found');
    }

    // Get ID Token
    const idToken = await auth.currentUser.getIdToken();

    try {
      const response = await fetch(config.analyzeImage, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          image: base64,
          mimeType,
          language,
          userId, // Pass userId to Cloud Function
        }),
      });

      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        console.error('Failed to parse response as JSON:', text);
        throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}...`);
      }

      if (!response.ok) {
        throw new Error(result.error || `Server error: ${response.status}`);
      }
      return result;
    } catch (error) {
      console.error('Analyze image error:', error);
      if (error.message.includes('Network request failed')) {
        throw new Error(t('networkError', language) || 'Network error. Please check your connection.');
      }
      throw error;
    }
  };

  const analyzeImageFromUri = async (uri) => {
    const base64 = await convertUriToBase64(uri);
    return await analyzeImageBase64(base64);
  };

  const handleDetectionResult = async (result, { silentNoItem = false } = {}) => {
    if (!result) {
      return false;
    }

    setScanResult(JSON.stringify(result, null, 2));

    if (result.saved && result.savedItems && result.savedItems.length > 0) {
      // Normalize categories
      const normalizedItems = result.savedItems.map(item => ({
        ...item,
        category: normalizeCategory(item.category)
      }));

      setDetectedItems({
        items: normalizedItems,
        expiryDate: result.expiryDate,
        detectionSource: result.detectionSource,
      });
      setShowReviewModal(true);
      
      // Refresh usage data to show updated count (decremented by server)
      if (auth.currentUser) {
        loadUsageData(auth.currentUser.uid);
      }
      
      return true;
    }

    if (result.expiryDate) {
      if (!silentNoItem) {
        Alert.alert(
          t('dateFound', language),
          `${t('dateFoundMessage', language)}${result.expiryDate}${t('noFoodRecognized', language)}`,
          [{ text: t('retry', language), onPress: () => scanAgain() }]
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

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    latestPhotoUriRef.current = photoUri;
  }, [photoUri]);

  // Remount camera when capture mode changes
  useEffect(() => {
    // Only remount if not recording to avoid interruptions
    if (!isRecording) {
      console.log(`[EFFECT] Capture mode changed to: ${captureMode}. Remounting camera.`);
      resetCameraReadyState();
      setCameraKey(prev => prev + 1);
    }
  }, [captureMode]);

  // Reset camera when screen comes into focus (fixes black screen when returning from other tabs)
  useFocusEffect(
    useCallback(() => {
      console.log('[FOCUS] Screen focused.');
      
      // Reset photo state when screen is focused
      setPhotoUri(null);
      setScanResult('');
      
      return () => {
        console.log('[FOCUS] Screen blurred. Cleaning up.');
        // Cleanup when leaving screen
        if (isRecordingRef.current) {
          stopVideoRecording();
        }
        
        // Clean up blob URL if on web
        const latestPhotoUri = latestPhotoUriRef.current;
        if (Platform.OS === 'web' && latestPhotoUri && latestPhotoUri.startsWith('blob:')) {
          URL.revokeObjectURL(latestPhotoUri);
        }

        // Reset readiness when leaving
        setIsCameraReady(false);
        isCameraReadyRef.current = false;
      };
    }, [])
  );

  // 5. Write a function called 'takePicture' that will be called by a button.
  const takePicture = async () => {
    console.log('[ACTION] takePicture called.');
    setProcessingMode('photo'); // Set mode for loading text
    // Check if user has scans remaining
    if (usageData && usageData.scansRemaining <= 0) {
      const tierText = usageData.tier === 'anonymous' 
        ? t('createAccountToGetMore', language)
        : t('upgradeToPremium', language);
      
      Alert.alert(
        t('scansLimitReached', language),
        tierText,
        [
          { text: t('cancel', language), style: 'cancel' },
          { 
            text: usageData.tier === 'anonymous' ? t('createAccount', language) : t('upgradeToPremium', language),
            onPress: () => {
              // Navigate to Pantry tab first, then to Profile screen
              navigation.navigate('Pantry', { screen: 'ProfileScreen' });
            }
          }
        ]
      );
      return;
    }

    if (Platform.OS === 'web') {
      // On web, trigger file input (only if not already loading)
      if (!isLoading) {
        fileInputRef.current?.click();
      }
    } else {
      console.log('[CAPTURE] Waiting for stable camera...');
      await waitForStableCamera();
      console.log('[CAPTURE] Camera is stable.');

      if (!cameraRef.current) {
        console.error('[CAPTURE] Camera reference not available after wait.');
        Alert.alert(t('error', language), t('cameraReferenceNotAvailable', language));
        return;
      }

      try {
        console.log('[CAPTURE] Calling takePictureAsync...');
        // High quality capture (1.0) as requested
        const photo = await cameraRef.current.takePictureAsync({
          quality: 1.0,
          base64: false,
        });
        
        if (!photo || !photo.uri) {
          console.error('[CAPTURE] takePictureAsync returned no URI.');
          Alert.alert(t('error', language), t('failedToCaptureImage', language));
          return;
        }
        
        console.log(`[CAPTURE] Photo captured successfully: ${photo.uri}`);
        setPhotoUri(photo.uri);
        // PHASE 2: Process the image after capture
        await processImage(photo.uri);
      } catch (error) {
        console.error('Camera error:', error);
        Alert.alert(t('error', language), t('failedToTakePicture', language) + ': ' + error.message);
      }
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
      Alert.alert(t('error', language), t('pleaseSelectImage', language));
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      Alert.alert(t('error', language), t('imageTooLarge', language));
      return;
    }

    try {
      const uri = URL.createObjectURL(file);
      setPhotoUri(uri);
      await processImage(uri);
    } catch (error) {
      console.error('File selection error:', error);
      Alert.alert(t('error', language), t('failedToLoadImage', language) + ': ' + error.message);
    } finally {
      // Reset file input so the same file can be selected again
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  // Toggle between photo and video mode
  const toggleCaptureMode = () => {
    const now = Date.now();
    if (now - lastToggleTime.current < 1500) {
      console.log('[ACTION] Toggle ignored - throttling active');
      return;
    }
    lastToggleTime.current = now;

    console.log(`[ACTION] Toggling capture mode from ${captureMode} to ${captureMode === 'photo' ? 'video' : 'photo'}`);
    if (isRecording) {
      Alert.alert(t('recordingInProgress', language), t('stopRecordingFirst', language));
      return;
    }
    // Just change mode - CameraView key already includes captureMode, so it will remount automatically
    setCaptureMode(prev => prev === 'photo' ? 'video' : 'photo');
  };

  // Video recording functions - SIMPLE VERSION THAT WORKED
  const startVideoRecording = async () => {
    console.log('[ACTION] startVideoRecording called.');
    setProcessingMode('video'); // Set mode for loading text
    // Check if user has scans remaining
    if (usageData && usageData.scansRemaining <= 0) {
      const tierText = usageData.tier === 'anonymous' 
        ? t('createAccountToGetMore', language)
        : t('upgradeToPremium', language);
      
      Alert.alert(
        t('scansLimitReached', language),
        tierText,
        [
          { text: t('cancel', language), style: 'cancel' },
          { 
            text: usageData.tier === 'anonymous' ? t('createAccount', language) : t('upgradeToPremium', language),
            onPress: () => {
              // Navigate to Pantry tab first, then to Profile screen
              navigation.navigate('Pantry', { screen: 'ProfileScreen' });
            }
          }
        ]
      );
      return;
    }

    if (Platform.OS === 'web') {
      Alert.alert(t('notSupported', language), t('videoOnMobileOnly', language));
      return;
    }

    // Ensure camera is in video mode; if not, switch and wait for remount
    if (captureMode !== 'video') {
      console.log('[CAPTURE] Mode is not video, switching...');
      resetCameraReadyState();
      setCaptureMode('video');
      setCameraKey(prev => prev + 1);
    }

    console.log('[CAPTURE] Waiting for stable camera for video...');
    await waitForStableCamera();
    console.log('[CAPTURE] Camera is stable for video.');

    if (!cameraRef.current) {
      console.error('[CAPTURE] Camera reference not available for video after wait.');
      Alert.alert(t('error', language), t('cameraNotAvailable', language));
      return;
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
      console.log('[CAPTURE] Starting video recording...');
      setIsRecording(true);
      isRecordingRef.current = true;
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
      console.log('[CAPTURE] Calling recordAsync...');
      const video = await cameraRef.current.recordAsync({
        maxDuration: 10,
        quality: '480p',
        mute: shouldMute,
      });

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }

      if (video && video.uri) {
        console.log(`[CAPTURE] Video recorded successfully: ${video.uri}`);
        await processVideoRecording(video.uri);
      } else {
        console.warn('[CAPTURE] recordAsync finished but returned no URI.');
      }

    } catch (error) {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      console.error('Video recording error:', error);
      const transientInitIssue = typeof error?.message === 'string' &&
        error.message.toLowerCase().includes('stopped before any data');

      if (transientInitIssue) {
        // Reinitialize camera to recover from Android race condition
        console.warn('[RECOVERY] Android transient init issue detected. Remounting camera.');
        resetCameraReadyState();
        setCameraKey(prev => prev + 1);
        Alert.alert(
          t('cameraNotReady', language),
          t('androidCameraIssue', language)
        );
      } else {
        Alert.alert(t('recordingError', language), error.message);
      }
    } finally {
      console.log('[CAPTURE] Finalizing video recording process.');
      setIsRecording(false);
      isRecordingRef.current = false;
      setRecordingDuration(0);
    }
  };

  const stopVideoRecording = (force = false) => {
    console.log('⏹ Stopping video recording...');
    if (cameraRef.current && (isRecordingRef.current || force)) {
      try {
        cameraRef.current.stopRecording();
      } catch (error) {
        console.warn('Stop recording ignored:', error?.message);
      }
    }

    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    if (isRecordingRef.current || isRecording) {
      isRecordingRef.current = false;
      setIsRecording(false);
      setRecordingDuration(0);
    }
  };

  // Process video recording - analyze the video file directly
  const processVideoRecording = async (videoUri) => {
    setIsLoading(true);
    setScanResult('Processing video...');

    try {
      console.log(`📹 Processing video: ${videoUri}`);
      
      // Read video file as base64
      const base64 = await FileSystem.readAsStringAsync(videoUri, { encoding: 'base64' });
      
      // Send to backend as video/mp4
      const result = await analyzeImageBase64(base64, 'video/mp4');
      
      handleDetectionResult(result);
      
    } catch (error) {
      console.error('Video processing error:', error);
      Alert.alert(
        t('videoProcessingError', language), 
        t('failedToProcessVideo', language),
        [{ text: t('ok', language), onPress: () => scanAgain() }]
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
    
    // On Android, a remount is often necessary after processing
    if (Platform.OS === 'android') {
      resetCameraReadyState();
      setCameraKey(prev => prev + 1);
    }
  };

  const deleteDetectedItem = async (itemId) => {
    try {
      const userId = auth.currentUser?.uid;
      
      if (!userId) {
        Alert.alert(t('error', language), t('noUserFound', language));
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
      Alert.alert(t('error', language), t('failedToDelete', language));
    }
  };

  const startEditItem = (item) => {
    console.log('Starting edit for item:', item.id, item.name);
    setEditingItemId(item.id);
    setEditItemName(item.name);
    setEditItemCategory(normalizeCategory(item.category));
    setEditItemQuantity(item.quantity?.toString() || '1');
    setEditItemUnit(item.unit || 'pcs');
    setEditItemExpiryDate(parseDate(item.expiryDate));
  };

  const closeEditItemModal = () => {
    setEditingItemId(null);
    setEditItemName('');
    setEditItemCategory('');
    setEditItemQuantity('1');
    setEditItemUnit('pcs');
    setEditItemExpiryDate(null);
    setShowEditDatePicker(false);
  };

  const handleEditDateChange = (event, selectedDate) => {
    setShowEditDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEditItemExpiryDate(selectedDate);
    }
  };

  const editCategories = CATEGORIES.map(c => c.id);

  const getEditCategoryTranslation = (category) => {
    return t(CATEGORY_KEY_MAP[category] || 'other', language);
  };

  const saveEditItem = async () => {
    console.log('Saving edit for item ID:', editingItemId, 'Name:', editItemName);
    if (!editingItemId || !editItemName.trim()) {
      Alert.alert(t('error', language), t('itemNameEmpty', language));
      return;
    }

    try {
      const userId = auth.currentUser?.uid;
      
      if (!userId) {
        Alert.alert(t('error', language), t('noUserFound', language));
        return;
      }

      console.log('Updating Firestore doc:', `users/${userId}/pantry/${editingItemId}`);
      const itemRef = doc(db, `users/${userId}/pantry`, editingItemId);
      await updateDoc(itemRef, {
        name: editItemName.trim(),
        itemName: editItemName.trim(),
        category: editItemCategory,
        quantity: parseInt(editItemQuantity) || 1,
        unit: editItemUnit,
        expiryDate: editItemExpiryDate ? editItemExpiryDate.toISOString() : null,
      });

      // Update local state
      setDetectedItems(prev => ({
        ...prev,
        items: prev.items.map(item =>
          item.id === editingItemId
            ? { 
                ...item, 
                name: editItemName.trim(), 
                category: editItemCategory,
                quantity: parseInt(editItemQuantity) || 1,
                unit: editItemUnit,
                expiryDate: editItemExpiryDate ? editItemExpiryDate.toISOString() : null,
              }
            : item
        )
      }));

      closeEditItemModal();
    } catch (error) {
      console.error('Error updating item:', error);
      Alert.alert(t('error', language), t('failedToUpdate', language));
    }
  };

  const cancelEditItem = () => {
    closeEditItemModal();
  };

  const confirmReview = () => {
    const remainingItems = detectedItems?.items.length || 0;
    
    // Close the review modal first
    setShowReviewModal(false);
    
    if (remainingItems === 0) {
      Alert.alert(t('allItemsRemoved', language), t('allItemsRemovedMessage', language));
      scanAgain();
    } else {
      // Small delay to ensure modal closes before alert shows
      setTimeout(() => {
        Alert.alert(
          `✅ ${t('success', language)}!`,
          `${remainingItems} ${t('itemsAddedToPantry', language)}\n\n${t('editDetailsInPantry', language)}`,
          [
            { text: t('scanMore', language), onPress: () => scanAgain() },
            { 
              text: t('viewPantry', language), 
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
        <Text style={styles.text}>{t('requestingCameraPermission', language)}</Text>
      </View>
    );
  }

  if (!permission?.granted && Platform.OS !== 'web') {
    // If permission is false, show a "No access to camera" text.
    return (
      <View style={styles.container}>
        <Text style={styles.text}>{t('noCameraAccess', language)}</Text>
        <Text style={styles.subText}>{t('enableCameraPermissions', language)}</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>{t('grantPermission', language)}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const captureDisabled = !isCameraReady || isLoading;

  // 9. Add another conditional render: If photoUri exists, display an Image component with the photo
  if (photoUri) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: photoUri }} style={styles.preview} />
        
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContent}>
              <ActivityIndicator size="large" color="#4A7C59" />
              <Text style={styles.loadingText}>
                {processingMode === 'video'
                  ? t('processingVideo', language)
                  : t('analyzing', language)
                }
              </Text>
              <Text style={styles.loadingSubtext}>
                {processingMode === 'video'
                  ? t('extractingFrame', language)
                  : t('detectingItems', language)
                }
              </Text>
            </View>
          </View>
        )}
        
        <TouchableOpacity 
          style={styles.scanAgainButton} 
          onPress={scanAgain}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>{t('scanAgain', language)}</Text>
        </TouchableOpacity>

        {/* Review Modal for photo mode */}
        <Modal
          visible={showReviewModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowReviewModal(false)}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.reviewModalOverlay}
          >
            <View style={styles.reviewModalContent}>
              {editingItemId ? (
                // Edit Mode
                <>
                  <Text style={styles.editModalTitle}>{t('editItem', language)}</Text>
                  
                  <ScrollView 
                    ref={editScrollViewRef}
                    style={styles.editModalScroll}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
                    {/* Item Name */}
                    <Text style={styles.editModalLabel}>{t('itemName', language)}</Text>
                    <TextInput
                      style={styles.editModalInput}
                      value={editItemName}
                      onChangeText={setEditItemName}
                      placeholder={t('foodNamePlaceholder', language)}
                      placeholderTextColor="#999"
                    />

                    {/* Category */}
                    <Text style={styles.editModalLabel}>{t('category', language)}</Text>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false} 
                      style={styles.editCategoryScroll}
                      keyboardShouldPersistTaps="handled"
                    >
                      {editCategories.map((cat) => (
                        <TouchableOpacity
                          key={cat}
                          style={[
                            styles.editCategoryChip,
                            editItemCategory === cat && styles.editCategoryChipSelected
                          ]}
                          onPress={() => setEditItemCategory(cat)}
                        >
                          <Text style={[
                            styles.editCategoryChipText,
                            editItemCategory === cat && styles.editCategoryChipTextSelected
                          ]}>
                            {getEditCategoryTranslation(cat)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    {/* Quantity */}
                    <Text style={styles.editModalLabel}>{t('quantity', language)}</Text>
                    <View style={styles.editQuantityRow}>
                      <TouchableOpacity
                        style={styles.editQuantityButton}
                        onPress={() => setEditItemQuantity(Math.max(1, parseInt(editItemQuantity) - 1).toString())}
                      >
                        <Ionicons name="remove" size={24} color="#4A7C59" />
                      </TouchableOpacity>
                      <TextInput
                        style={styles.editQuantityInput}
                        value={editItemQuantity}
                        onChangeText={setEditItemQuantity}
                        keyboardType="numeric"
                        textAlign="center"
                      />
                      <TouchableOpacity
                        style={styles.editQuantityButton}
                        onPress={() => setEditItemQuantity((parseInt(editItemQuantity) + 1).toString())}
                      >
                        <Ionicons name="add" size={24} color="#4A7C59" />
                      </TouchableOpacity>
                    </View>

                    {/* Unit */}
                    <Text style={styles.editModalLabel}>{t('unit', language)}</Text>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false} 
                      style={styles.editUnitScroll}
                      keyboardShouldPersistTaps="handled"
                    >
                      {UNITS.map((unitObj) => (
                        <TouchableOpacity
                          key={unitObj.id}
                          style={[
                            styles.editUnitChip,
                            editItemUnit === unitObj.id && styles.editUnitChipSelected
                          ]}
                          onPress={() => setEditItemUnit(unitObj.id)}
                        >
                          <Text style={[
                            styles.editUnitChipText,
                            editItemUnit === unitObj.id && styles.editUnitChipTextSelected
                          ]}>
                            {t(unitObj.translationKey, language)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    {/* Expiry Date */}
                    <Text style={styles.editModalLabel}>{t('expiryDate', language)}</Text>
                    <View style={styles.editDateContainer}>
                      <TouchableOpacity
                        style={styles.editDateButton}
                        onPress={() => {
                          if (!editItemExpiryDate) {
                            setEditItemExpiryDate(new Date());
                          }
                          setShowEditDatePicker(!showEditDatePicker);
                        }}
                      >
                        <Ionicons name="calendar-outline" size={20} color="#4A7C59" />
                        <Text style={styles.editDateButtonText}>
                          {editItemExpiryDate ? formatDate(editItemExpiryDate, language) : t('notSet', language) || 'Not set'}
                        </Text>
                      </TouchableOpacity>
                      {editItemExpiryDate && (
                        <TouchableOpacity 
                          style={styles.clearDateButton}
                          onPress={() => {
                            setEditItemExpiryDate(null);
                            setShowEditDatePicker(false);
                          }}
                        >
                          <Ionicons name="close-circle" size={24} color="#FF6B6B" />
                        </TouchableOpacity>
                      )}
                    </View>

                    {showEditDatePicker && (
                      <DateTimePicker
                        value={editItemExpiryDate || new Date()}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={handleEditDateChange}
                        minimumDate={new Date(new Date().setHours(0, 0, 0, 0))}
                      />
                    )}
                  </ScrollView>

                  {/* Modal Buttons */}
                  <View style={styles.editModalButtons}>
                    <TouchableOpacity
                      style={[styles.editModalButton, styles.editModalCancelButton]}
                      onPress={cancelEditItem}
                    >
                      <Text style={styles.editModalCancelButtonText}>{t('cancel', language)}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.editModalButton, styles.editModalSaveButton]}
                      onPress={saveEditItem}
                    >
                      <Text style={styles.editModalSaveButtonText}>{t('save', language)}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                // List Mode
                <>
                  <Text style={styles.reviewModalTitle}>{t('itemsDetected', language)}</Text>
                  <Text style={styles.reviewModalSubtitle}>
                    {t('reviewSubtitle', language)}
                  </Text>

                  <ScrollView style={styles.reviewItemsList}>
                    {detectedItems?.items.map((item, index) => (
                      <View key={item.id} style={styles.reviewItem}>
                        <View style={styles.reviewItemInfo}>
                          <Text style={styles.reviewItemName}>{item.name}</Text>
                          <Text style={styles.reviewItemCategory}>
                            {t(CATEGORY_KEY_MAP[normalizeCategory(item.category)] || 'other', language)}
                          </Text>
                          {item.expiryDate && (
                            <Text style={styles.reviewItemExpiry}>
                              📅 {new Date(item.expiryDate).toLocaleDateString()}
                            </Text>
                          )}
                          {item.quantity && (
                            <Text style={styles.reviewItemQuantity}>
                              📦 {item.quantity} {item.unit || 'pieces'}
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
                                t('removeItem', language),
                                `${t('remove', language)} "${item.name}"?`,
                                [
                                  { text: t('cancel', language), style: 'cancel' },
                                  { 
                                    text: t('remove', language), 
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
                </>
              )}
            </View>
          </KeyboardAvoidingView>
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
              <ActivityIndicator size="large" color="#4A7C59" />
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
                <ActivityIndicator size="large" color="#4A7C59" />
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
          
          {isFocused && isAppActive && (
            <CameraView 
              key={`${cameraKey}-${captureMode}`}
              style={styles.camera} 
              facing="back"
              // Ensure camera is configured for the intended operation
              mode={captureMode === 'video' ? 'video' : 'picture'}
              ref={cameraRef}
              onCameraReady={handleCameraReady}
              enableTorch={torchEnabled}
            />
          )}
          {/* Overlay UI positioned absolutely over camera */}
          <View style={styles.cameraOverlay}>
            {/* Usage counter badge at top */}
            {!loadingUsage && usageData && (
              <View style={styles.usageCounterBadge}>
                <Ionicons name="camera-outline" size={14} color="#fff" />
                <Text style={styles.usageCounterText}>
                  {usageData.tier === 'premium' 
                    ? `${usageData.scansRemaining}/500`
                    : usageData.scansRemaining
                  }
                </Text>
              </View>
            )}

            {/* Flashlight Toggle */}
            <TouchableOpacity 
              style={styles.torchButton}
              onPress={() => setTorchEnabled(!torchEnabled)}
            >
              <Ionicons 
                name={torchEnabled ? "flash" : "flash-off"} 
                size={24} 
                color={torchEnabled ? "#FFD700" : "#FFF"} 
              />
            </TouchableOpacity>
            
            {/* Mode Toggle at top */}
            <View style={styles.topControls}>
              <TouchableOpacity 
                style={[styles.modeButton, captureMode === 'video' && styles.modeButtonActive]}
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
              {!isCameraReady && (
                <Text style={styles.cameraReadyHint}>{t('cameraInitializing', language)}</Text>
              )}
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
                      captureMode === 'video' && styles.videoCaptureButton,
                      captureDisabled && styles.captureButtonDisabled
                    ]} 
                    onPress={captureMode === 'photo' ? takePicture : startVideoRecording}
                    disabled={captureDisabled}
                  >
                    <View style={[
                      styles.captureButtonInner,
                      captureMode === 'video' && styles.videoButtonInner
                    ]}>
                      {/* Empty - icon removed per user preference */}
                    </View>
                  </TouchableOpacity>
                  <Text style={styles.captureHint}>
                    {!isCameraReady
                      ? t('cameraInitializing', language)
                      : captureMode === 'video'
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
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.reviewModalOverlay}
        >
          <View style={styles.reviewModalContent}>
            {editingItemId ? (
              // Edit Mode
              <>
                <Text style={styles.editModalTitle}>{t('editItem', language)}</Text>
                
                <ScrollView 
                  ref={editScrollViewRef}
                  style={styles.editModalScroll}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {/* Item Name */}
                  <Text style={styles.editModalLabel}>{t('itemName', language)}</Text>
                  <TextInput
                    style={styles.editModalInput}
                    value={editItemName}
                    onChangeText={setEditItemName}
                    placeholder={t('foodNamePlaceholder', language)}
                    placeholderTextColor="#999"
                  />

                  {/* Category */}
                  <Text style={styles.editModalLabel}>{t('category', language)}</Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    style={styles.editCategoryScroll}
                    keyboardShouldPersistTaps="handled"
                  >
                    {editCategories.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.editCategoryChip,
                          editItemCategory === cat && styles.editCategoryChipSelected
                        ]}
                        onPress={() => setEditItemCategory(cat)}
                      >
                        <Text style={[
                          styles.editCategoryChipText,
                          editItemCategory === cat && styles.editCategoryChipTextSelected
                        ]}>
                          {getEditCategoryTranslation(cat)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Quantity */}
                  <Text style={styles.editModalLabel}>{t('quantity', language)}</Text>
                  <View style={styles.editQuantityRow}>
                    <TouchableOpacity
                      style={styles.editQuantityButton}
                      onPress={() => setEditItemQuantity(Math.max(1, parseInt(editItemQuantity) - 1).toString())}
                    >
                      <Ionicons name="remove" size={24} color="#4A7C59" />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.editQuantityInput}
                      value={editItemQuantity}
                      onChangeText={setEditItemQuantity}
                      keyboardType="numeric"
                      textAlign="center"
                    />
                    <TouchableOpacity
                      style={styles.editQuantityButton}
                      onPress={() => setEditItemQuantity((parseInt(editItemQuantity) + 1).toString())}
                    >
                      <Ionicons name="add" size={24} color="#4A7C59" />
                    </TouchableOpacity>
                  </View>

                  {/* Unit */}
                  <Text style={styles.editModalLabel}>{t('unit', language)}</Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    style={styles.editUnitScroll}
                    keyboardShouldPersistTaps="handled"
                  >
                    {UNITS.map((unitObj) => (
                      <TouchableOpacity
                        key={unitObj.id}
                        style={[
                          styles.editUnitChip,
                          editItemUnit === unitObj.id && styles.editUnitChipSelected
                        ]}
                        onPress={() => setEditItemUnit(unitObj.id)}
                      >
                        <Text style={[
                          styles.editUnitChipText,
                          editItemUnit === unitObj.id && styles.editUnitChipTextSelected
                        ]}>
                          {t(unitObj.translationKey, language)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Expiry Date */}
                  <Text style={styles.editModalLabel}>{t('expiryDate', language)}</Text>
                  <View style={styles.editDateContainer}>
                    <TouchableOpacity
                      style={styles.editDateButton}
                      onPress={() => {
                        if (!editItemExpiryDate) {
                          setEditItemExpiryDate(new Date());
                        }
                        setShowEditDatePicker(!showEditDatePicker);
                      }}
                    >
                      <Ionicons name="calendar-outline" size={20} color="#4A7C59" />
                      <Text style={styles.editDateButtonText}>
                        {editItemExpiryDate ? formatDate(editItemExpiryDate, language) : t('notSet', language) || 'Not set'}
                      </Text>
                    </TouchableOpacity>
                    {editItemExpiryDate && (
                      <TouchableOpacity 
                        style={styles.clearDateButton}
                        onPress={() => {
                          setEditItemExpiryDate(null);
                          setShowEditDatePicker(false);
                        }}
                      >
                        <Ionicons name="close-circle" size={24} color="#FF6B6B" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {showEditDatePicker && (
                    <DateTimePicker
                      value={editItemExpiryDate || new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleEditDateChange}
                      minimumDate={new Date(new Date().setHours(0, 0, 0, 0))}
                    />
                  )}
                </ScrollView>

                {/* Modal Buttons */}
                <View style={styles.editModalButtons}>
                  <TouchableOpacity
                    style={[styles.editModalButton, styles.editModalCancelButton]}
                    onPress={cancelEditItem}
                  >
                    <Text style={styles.editModalCancelButtonText}>{t('cancel', language)}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.editModalButton, styles.editModalSaveButton]}
                    onPress={saveEditItem}
                  >
                    <Text style={styles.editModalSaveButtonText}>{t('save', language)}</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              // List Mode
              <>
                <Text style={styles.reviewModalTitle}>{t('itemsDetected', language)}</Text>
                <Text style={styles.reviewModalSubtitle}>
                  {t('reviewSubtitle', language)}
                </Text>

                <ScrollView style={styles.reviewItemsList}>
                  {detectedItems?.items.map((item, index) => (
                    <View key={item.id} style={styles.reviewItem}>
                      <View style={styles.reviewItemInfo}>
                        <Text style={styles.reviewItemName}>{item.name}</Text>
                        <Text style={styles.reviewItemCategory}>{item.category}</Text>
                        {item.expiryDate && (
                          <Text style={styles.reviewItemExpiry}>
                            📅 {new Date(item.expiryDate).toLocaleDateString()}
                          </Text>
                        )}
                        {item.quantity && (
                          <Text style={styles.reviewItemQuantity}>
                            📦 {item.quantity} {item.unit || 'pieces'}
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
                              t('removeItem', language),
                              `${t('remove', language)} "${item.name}"?`,
                              [
                                { text: t('cancel', language), style: 'cancel' },
                                { 
                                  text: t('remove', language), 
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
              </>
            )}
          </View>
        </KeyboardAvoidingView>
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
    color: '#4A7C59', // Sage Green
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
    backgroundColor: '#4A7C59', // Sage Green
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 30,
    marginBottom: 20,
    shadowColor: '#4A7C59',
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
    color: '#4A7C59', // Sage Green
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
    backgroundColor: '#4A7C59', // Sage Green
    borderColor: '#4A7C59',
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
    backgroundColor: '#FF3B30', // Red
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
    backgroundColor: '#E07A5F', // Terracotta
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
    backgroundColor: '#E07A5F', // Terracotta
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
    backgroundColor: 'rgba(74, 124, 89, 0.2)', // Sage Green transparent
    padding: 30,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#4A7C59', // Sage Green
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
    color: '#4A7C59', // Sage Green
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
    color: '#4A7C59', // Sage Green
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
    borderLeftColor: '#4A7C59', // Sage Green
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
    color: '#4A7C59', // Sage Green
    backgroundColor: '#E8F5E9', // Light Green
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
    backgroundColor: '#4A7C59', // Sage Green
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
    backgroundColor: '#4A7C59', // Sage Green
    shadowColor: '#4A7C59',
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
  usageCounterBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
    zIndex: 10,
  },
  usageCounterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  torchButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 12,
    borderRadius: 25,
    zIndex: 20,
  },
  // Edit Item Modal Styles
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  editModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  editModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 20,
    textAlign: 'center',
  },
  editModalScroll: {
    maxHeight: 400,
  },
  editModalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginTop: 12,
  },
  editModalInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#F8F9FA',
    color: '#2C3E50',
  },
  editCategoryScroll: {
    flexGrow: 0,
    marginBottom: 8,
  },
  editCategoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  editCategoryChipSelected: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4A7C59',
  },
  editCategoryChipText: {
    fontSize: 14,
    color: '#666',
  },
  editCategoryChipTextSelected: {
    color: '#4A7C59',
    fontWeight: '600',
  },
  editQuantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginVertical: 8,
  },
  editQuantityButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4A7C59',
  },
  editQuantityInput: {
    width: 80,
    height: 44,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    fontSize: 18,
    fontWeight: '600',
    backgroundColor: '#F8F9FA',
    color: '#2C3E50',
  },
  editUnitScroll: {
    flexGrow: 0,
    marginBottom: 8,
  },
  editUnitChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  editUnitChipSelected: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4A7C59',
  },
  editUnitChipText: {
    fontSize: 14,
    color: '#666',
  },
  editUnitChipTextSelected: {
    color: '#4A7C59',
    fontWeight: '600',
  },
  editDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editDateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#F8F9FA',
    gap: 10,
  },
  clearDateButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editDateButtonText: {
    fontSize: 16,
    color: '#2C3E50',
  },
  editModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  editModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  editModalCancelButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  editModalCancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  editModalSaveButton: {
    backgroundColor: '#4A7C59',
  },
  editModalSaveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  reviewItemQuantity: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
});




