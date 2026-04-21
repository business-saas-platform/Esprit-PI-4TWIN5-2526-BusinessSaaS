import * as faceapi from '@vladmandic/face-api';
import { useRef, useState, useCallback } from 'react';

export const useFaceRecognition = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const loadModels = useCallback(async () => {
    setIsLoading(true);
    try {
      const MODEL_URL = '/models';
      console.log('[Face Recognition] Loading models from:', MODEL_URL);
      
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL).then(() => console.log('✅ tinyFaceDetector loaded')).catch((e) => {
          console.error('❌ tinyFaceDetector failed:', e);
          throw e;
        }),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL).then(() => console.log('✅ faceLandmark68Net loaded')).catch((e) => {
          console.error('❌ faceLandmark68Net failed:', e);
          throw e;
        }),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL).then(() => console.log('✅ faceRecognitionNet loaded')).catch((e) => {
          console.error('❌ faceRecognitionNet failed:', e);
          throw e;
        }),
      ]);
      console.log('[Face Recognition] ✅ All models loaded successfully');
      setIsModelLoaded(true);
    } catch (error) {
      console.error('[Face Recognition] ❌ Error loading face models:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      return mediaStream;
    } catch (error) {
      console.error('[Face Recognition] Error accessing camera:', error);
      throw error;
    }
  }, []);

  const stopCamera = useCallback(() => {
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
  }, [stream]);

  const getFaceDescriptor = useCallback(async (): Promise<number[] | null> => {
    if (!videoRef.current) return null;

    try {
      const detection = await faceapi
        .detectSingleFace(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions()
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        console.log('[Face Recognition] No face detected');
        return null;
      }

      console.log('[Face Recognition] Face detected, descriptor extracted');
      return Array.from(detection.descriptor);
    } catch (error) {
      console.error('[Face Recognition] Error getting face descriptor:', error);
      throw error;
    }
  }, []);

  return {
    videoRef,
    isLoading,
    isModelLoaded,
    loadModels,
    startCamera,
    stopCamera,
    getFaceDescriptor,
  };
};
