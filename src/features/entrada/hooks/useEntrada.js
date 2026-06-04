import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@chakra-ui/react';
import { entradaService } from '../services/entradaService';
import { useAuthStore } from '../../auth/stores/useAuthStore';
import { compressImage } from '../../checkinout/utils/deviceUtils';

export const useEntrada = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasMarkedToday, setHasMarkedToday] = useState(false);
  const [location, setLocation] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  
  // Selfie States
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  const toast = useToast();
  const salesEmployeeCode = useAuthStore((state) => state.salesEmployeeCode);

  const checkStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const status = await entradaService.checkTodayAttendance();
      setHasMarkedToday(status.registered);
    } catch (error) {
      console.error("Error checking attendance status:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    try {
      // Comprimir la imagen a máximo 1MB
      const compressedFile = await compressImage(file, 1);
      setImage(compressedFile);

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setIsProcessingImage(false);
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      setIsProcessingImage(false);
      toast({
        title: "Error al procesar imagen",
        description: error.message || "Intenta con otra foto",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    }
  };

  const resetImage = () => {
    setImage(null);
    setImagePreview(null);
  };

  const getLocation = useCallback(() => {
    setIsGettingLocation(true);
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        toast({
          title: 'Error de ubicación',
          description: 'Geolocalización no soportada por el navegador.',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        setIsGettingLocation(false);
        reject('No geolocation');
      } else {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const coords = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            setLocation(coords);
            setIsGettingLocation(false);
            resolve(coords);
          },
          (error) => {
            toast({
              title: 'Error obteniendo ubicación',
              description: 'Asegúrese de dar permisos de ubicación.',
              status: 'error',
              duration: 3000,
              isClosable: true,
            });
            setIsGettingLocation(false);
            reject(error);
          }
        );
      }
    });
  }, [toast]);

  const handleMarcarIngreso = async () => {
    if (!image) {
      toast({
        title: 'Foto requerida',
        description: 'Debes tomarte una selfie para marcar el ingreso.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
        position: 'top-right'
      });
      return;
    }

    setIsLoading(true);
    try {
      let currentLoc = location;
      if (!currentLoc) {
        currentLoc = await getLocation();
      }
      
      const response = await entradaService.marcarIngreso(salesEmployeeCode, currentLoc, image);
      
      setHasMarkedToday(true);
      resetImage();
      
      toast({
        title: 'Éxito',
        description: response.message || 'Ingreso marcado correctamente',
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top-right'
      });
      
    } catch (error) {
      console.error(error);
      const errorMsg = error.response?.data?.message || 'Ocurrió un error al marcar el ingreso.';
      toast({
        title: 'Error',
        description: errorMsg,
        status: 'error',
        duration: 3000,
        isClosable: true,
        position: 'top-right'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return {
    handleMarcarIngreso,
    hasMarkedToday,
    isLoading: isLoading || isGettingLocation,
    location,
    getLocation,
    checkStatus,
    image,
    imagePreview,
    isProcessingImage,
    handleImageChange,
    resetImage
  };
};
