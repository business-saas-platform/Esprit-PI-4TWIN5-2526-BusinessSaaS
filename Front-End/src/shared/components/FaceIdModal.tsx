import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Camera, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { useFaceRecognition } from '@/hooks/useFaceRecognition';
import { api } from '@/shared/lib/apiClient';

type FaceIdModalMode = 'register' | 'login';

interface FaceIdModalProps {
  open: boolean;
  mode: FaceIdModalMode;
  onClose: () => void;
  onSuccess?: (token?: string) => void;
}

export function FaceIdModal({
  open,
  mode,
  onClose,
  onSuccess,
}: FaceIdModalProps) {
  const {
    videoRef,
    isLoading: isModelsLoading,
    isModelLoaded,
    loadModels,
    startCamera,
    stopCamera,
    getFaceDescriptor,
  } = useFaceRecognition();

  const [step, setStep] = useState<'loading' | 'ready' | 'scanning' | 'success' | 'error'>(
    'loading'
  );
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Initialize models on mount
  useEffect(() => {
    if (!open) return;

    const init = async () => {
      try {
        await loadModels();
        setStep('ready');
      } catch (err) {
        console.error('Failed to load models:', err);
        setErrorMessage('Impossible de charger les modèles IA');
        setStep('error');
      }
    };

    init();
  }, [open, loadModels]);

  // Start camera when ready
  useEffect(() => {
    if (step !== 'ready' || !isModelLoaded) return;

    const init = async () => {
      try {
        await startCamera();
      } catch (err: any) {
        console.error('Failed to start camera:', err);
        setErrorMessage(
          err.name === 'NotAllowedError'
            ? 'Accès à la caméra refusé. Vérifiez les permissions.'
            : 'Impossible d\'accéder à la caméra'
        );
        setStep('error');
      }
    };

    init();
  }, [step, isModelLoaded, startCamera]);

  // Cleanup camera when modal closes
  useEffect(() => {
    return () => {
      if (!open) {
        stopCamera();
      }
    };
  }, [open, stopCamera]);

  const handleCapture = async () => {
    setIsScanning(true);
    setStep('scanning');
    setErrorMessage('');

    try {
      // Try multiple times to get a good descriptor
      let descriptor = null;
      let attempts = 0;
      const maxAttempts = 10;

      while (!descriptor && attempts < maxAttempts) {
        descriptor = await getFaceDescriptor();
        if (!descriptor) {
          await new Promise((r) => setTimeout(r, 200));
        }
        attempts++;
      }

      if (!descriptor) {
        setErrorMessage(
          'Aucun visage détecté. Assurez-vous que votre visage est bien visible.'
        );
        setStep('error');
        setIsScanning(false);
        return;
      }

      // Mode: register
      if (mode === 'register') {
        try {
          const response = await api<{ message: string }>('/auth/register-face', {
            method: 'POST',
            body: JSON.stringify({ descriptor }),
          });
          console.log('[FaceIdModal] Face registered:', response);
          setStep('success');
          toast.success('✅ Face ID configuré avec succès');
          setTimeout(() => {
            stopCamera();
            onClose();
            onSuccess?.();
          }, 1500);
        } catch (err: any) {
          console.error('[FaceIdModal] Registration error:', err);
          setErrorMessage(
            err.response?.data?.message || 'Erreur lors de l\'enregistrement'
          );
          setStep('error');
        }
      }

      // Mode: login
      else if (mode === 'login') {
        try {
          const response = await api<{ access_token: string; user: any }>('/auth/face-login', {
            method: 'POST',
            body: JSON.stringify({ descriptor }),
          });
          console.log('[FaceIdModal] Face login successful:', response);

          // Save token
          localStorage.setItem('access_token', response.access_token);
          localStorage.setItem('auth_user', JSON.stringify(response.user));

          // Clear previous business ID
          localStorage.removeItem('current_business_id');

          setStep('success');
          toast.success('✅ Connexion réussie!');

          setTimeout(() => {
            stopCamera();
            onClose();
            // Dispatch auth change event
            window.dispatchEvent(new Event('auth-changed'));
            onSuccess?.(response.access_token);
          }, 1500);
        } catch (err: any) {
          console.error('[FaceIdModal] Login error:', err);
          setErrorMessage(
            err.response?.data?.message || 'Visage non reconnu. Réessayez.'
          );
          setStep('error');
        }
      }
    } catch (err) {
      console.error('[FaceIdModal] Capture error:', err);
      setErrorMessage('Erreur lors de la capture du visage');
      setStep('error');
    } finally {
      setIsScanning(false);
    }
  };

  const handleRetry = () => {
    setErrorMessage('');
    setStep('ready');
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const getStatusMessage = () => {
    switch (step) {
      case 'loading':
        return 'Chargement du modèle IA...';
      case 'ready':
        return 'Placez votre visage dans le cadre';
      case 'scanning':
        return 'Analyse en cours...';
      case 'success':
        return mode === 'register'
          ? '✅ Visage détecté et enregistré!'
          : '✅ Visage reconnu!';
      case 'error':
        return errorMessage || 'Erreur lors de la capture';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md rounded-[28px] border-slate-200 p-0">
        <DialogHeader className="border-b border-slate-100 px-6 py-4">
          <DialogTitle className="text-xl">
            🔐{' '}
            {mode === 'register'
              ? 'Configuration Face ID'
              : 'Connexion Face ID'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'register'
              ? 'Enregistrez votre visage pour la connexion rapide'
              : 'Utilisez votre visage pour vous connecter'}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6">
          {/* VIDEO CONTAINER */}
          <div className="relative mb-6 overflow-hidden rounded-[20px] bg-slate-100">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-80 w-full object-cover"
            />

            {/* OVAL GUIDE OVERLAY */}
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 640 480"
              preserveAspectRatio="xMidYMid slice"
            >
              <defs>
                <mask id="oval-mask">
                  <rect width="640" height="480" fill="white" />
                  <ellipse cx="320" cy="240" rx="140" ry="180" fill="black" />
                </mask>
              </defs>
              <rect
                width="640"
                height="480"
                fill="rgba(0,0,0,0.3)"
                mask="url(#oval-mask)"
              />
              <ellipse
                cx="320"
                cy="240"
                rx="140"
                ry="180"
                fill="none"
                stroke="#a78bfa"
                strokeWidth="3"
              />
            </svg>

            {/* LOADING SPINNER */}
            {(isModelsLoading || step === 'scanning') && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <Loader2 className="h-12 w-12 animate-spin text-white" />
              </div>
            )}
          </div>

          {/* STATUS MESSAGE */}
          <p
            className={`mb-6 text-center text-sm font-medium ${
              step === 'error'
                ? 'text-red-600'
                : step === 'success'
                  ? 'text-green-600'
                  : 'text-slate-600'
            }`}
          >
            {getStatusMessage()}
          </p>

          {/* ACTION BUTTONS */}
          <div className="flex gap-3">
            {step === 'error' && (
              <>
                <Button
                  onClick={handleRetry}
                  className="h-11 flex-1 rounded-2xl bg-indigo-600 hover:bg-indigo-700"
                >
                  Réessayer
                </Button>
                <Button
                  onClick={handleClose}
                  variant="outline"
                  className="h-11 flex-1 rounded-2xl"
                >
                  Annuler
                </Button>
              </>
            )}

            {step === 'success' && (
              <Button
                onClick={handleClose}
                className="h-11 w-full rounded-2xl bg-green-600 hover:bg-green-700"
              >
                ✅ Terminé
              </Button>
            )}

            {(step === 'ready' || step === 'loading') && (
              <>
                <Button
                  onClick={handleCapture}
                  disabled={isModelsLoading || step === 'loading'}
                  className="h-11 flex-1 rounded-2xl bg-indigo-600 hover:bg-indigo-700"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Capturer
                </Button>
                <Button
                  onClick={handleClose}
                  variant="outline"
                  className="h-11 flex-1 rounded-2xl"
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}

            {step === 'scanning' && (
              <Button disabled className="h-11 w-full rounded-2xl">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyse en cours...
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
