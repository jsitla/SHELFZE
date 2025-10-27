# Shelfze - Project Instructions

## Project Overview
Shelfze is a React Native Expo application that uses Google Cloud Vision API to scan food items and detect expiry dates, storing them in Firestore for tracking.

## Technology Stack
- React Native with Expo
- expo-camera for image capture
- Google Cloud Vision API for OCR and object detection
- Firebase/Firestore for data storage
- Cloud Functions for serverless processing

## Development Guidelines
- Test after each phase completion
- Focus on UX at every step
- Use clear, descriptive variable names
- Follow React hooks best practices
- Handle permissions gracefully
- Implement proper error handling

## Project Phases
1. **Phase 1**: Camera View - Full-screen camera with capture functionality
2. **Phase 2**: Cloud Connection - Image processing with Vision API
3. **Phase 3**: Parsing & Storage - Expiry date extraction and Firestore integration
4. **Phase 4**: UI - Display pantry items sorted by expiration
