import { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import DashboardModal from "@uppy/react/dashboard-modal";
import "@uppy/core/dist/style.min.css";
import "@uppy/dashboard/dist/style.min.css";
import AwsS3 from "@uppy/aws-s3";
import type { UploadResult, UppyFile } from "@uppy/core";
import { Button } from "@/components/ui/button";
import { compressImage, formatFileSize } from "@/lib/imageCompressor";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  compressImages?: boolean;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>
  ) => void;
  buttonClassName?: string;
  children: ReactNode;
}

export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760,
  compressImages = true,
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();
  const toastRef = useRef(toast);
  const tRef = useRef(t);
  toastRef.current = toast;
  tRef.current = t;
  
  const [uppy] = useState(() => {
    const instance = new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize: compressImages ? 50 * 1024 * 1024 : maxFileSize,
      },
      autoProceed: false,
    })
      .use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: onGetUploadParameters,
      })
      .on("complete", (result) => {
        onComplete?.(result);
      });
    
    return instance;
  });
  
  useEffect(() => {
    if (!compressImages) return;
    
    const handleFileAdded = async (file: UppyFile<Record<string, unknown>, Record<string, unknown>>) => {
      if (!file.data || !(file.data instanceof File)) return;
      if (!file.type?.startsWith('image/')) return;
      
      try {
        const result = await compressImage(file.data as File);
        
        if (result.exceedsLimit) {
          uppy.removeFile(file.id);
          toastRef.current({
            title: tRef.current("common.error"),
            description: tRef.current("common.imageTooLarge", {
              size: formatFileSize(result.compressedSize),
              limit: "2 MB",
            }),
            variant: "destructive",
          });
          return;
        }
        
        if (result.wasCompressed) {
          const newFile = new File([result.blob], file.name, { type: file.type });
          uppy.setFileState(file.id, {
            data: newFile,
            size: result.compressedSize,
          });
          
          toastRef.current({
            title: tRef.current("common.imageCompressed"),
            description: tRef.current("common.imageCompressedDesc", {
              from: formatFileSize(result.originalSize),
              to: formatFileSize(result.compressedSize),
            }),
          });
        }
      } catch (error) {
        console.error('Image compression failed:', error);
      }
    };
    
    uppy.on('file-added', handleFileAdded);
    
    return () => {
      uppy.off('file-added', handleFileAdded);
    };
  }, [uppy, compressImages]);

  return (
    <div>
      <Button onClick={() => setShowModal(true)} className={buttonClassName}>
        {children}
      </Button>

      <DashboardModal
        uppy={uppy}
        open={showModal}
        onRequestClose={() => setShowModal(false)}
        proudlyDisplayPoweredByUppy={false}
      />
    </div>
  );
}
