import React, { useEffect, useRef, useState } from 'react';
import { Camera, XCircle, CheckCircle } from 'lucide-react';

interface QrScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export const QrScanner: React.FC<QrScannerProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setHasPermission(true);
        }
      } catch (err) {
        console.error("Camera error:", err);
        setHasPermission(false);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleSimulateScan = () => {
    setSimulating(true);
    setTimeout(() => {
      // Simulate scanning a code "CS101-ALG-2023" for demo purposes if real scanning isn't implemented via a heavy library
      onScan("CS101-ALG-2023"); 
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-700">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-white hover:text-red-400 transition-colors"
        >
          <XCircle size={32} />
        </button>

        <div className="relative aspect-[3/4] w-full bg-black flex items-center justify-center">
          {hasPermission === null && <p className="text-white">Requesting camera...</p>}
          {hasPermission === false && (
            <div className="text-center p-6">
              <p className="text-red-400 mb-4">Camera access denied or unavailable.</p>
              <button 
                onClick={onClose}
                className="bg-gray-700 text-white px-4 py-2 rounded-lg"
              >
                Close
              </button>
            </div>
          )}
          {hasPermission && (
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="absolute inset-0 w-full h-full object-cover" 
            />
          )}
          
          {/* Scanning Overlay UI */}
          <div className="absolute inset-0 border-2 border-transparent pointer-events-none flex flex-col items-center justify-center">
             <div className="w-64 h-64 border-4 border-indigo-500 rounded-xl relative opacity-50">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-indigo-400 -mt-1 -ml-1"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-indigo-400 -mt-1 -mr-1"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-indigo-400 -mb-1 -ml-1"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-indigo-400 -mb-1 -mr-1"></div>
             </div>
             <p className="mt-8 text-white font-medium bg-black/50 px-4 py-1 rounded-full">
               Align QR code within frame
             </p>
          </div>

          {simulating && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-20">
               <CheckCircle className="text-green-500 w-16 h-16 mb-2 animate-bounce" />
               <p className="text-white font-bold">Code Detected!</p>
            </div>
          )}
        </div>

        <div className="p-4 bg-gray-800 border-t border-gray-700 flex justify-center">
           {/* Fallback for environment without QR library in this specific setup */}
           <button 
             onClick={handleSimulateScan}
             disabled={simulating}
             className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-full font-medium transition-all shadow-lg active:scale-95 disabled:opacity-50"
           >
             <Camera size={20} />
             <span>{simulating ? 'Scanning...' : 'Simulate Successful Scan'}</span>
           </button>
        </div>
      </div>
    </div>
  );
};
