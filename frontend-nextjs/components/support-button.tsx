import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DollarSign } from 'lucide-react';
import Script from 'next/script';
import Image from 'next/image';
import { Github, Linkedin } from 'lucide-react';

// Add the global type declaration for PayPal
declare global {
  interface Window {
    paypal: any;
  }
}

// Custom X Logo component
function XLogo() {
  return (
    <svg 
      viewBox="0 0 24 24" 
      aria-hidden="true" 
      className="h-5 w-5"
      fill="currentColor"
    >
      <path d="M13.3174 10.7749L19.1457 4H17.7646L12.7852 9.88256L8.80099 4H4L10.0114 12.8955L4 20H5.38115L10.5446 13.7878L14.7064 20H19.5074L13.3174 10.7749ZM11.1087 12.9787L10.3666 11.9324L5.62947 5.11896H8.01397L11.8461 10.6942L12.5881 11.7405L17.5769 18.881H15.1924L11.1087 12.9787Z"></path>
    </svg>
  );
}

export function SupportButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [paymentMode, setPaymentMode] = useState('international'); // 'international' or 'india'
  
  // This effect will render the PayPal button whenever the modal is opened
  // and the script has been loaded
  useEffect(() => {
    if (isModalOpen && scriptLoaded && window.paypal && paymentMode === 'international') {
      try {
        // Clear the container first to avoid duplicate rendering issues
        const container = document.getElementById('paypal-container-47SW4TJJB2GTU');
        if (container) {
          container.innerHTML = '';
        }
        
        // Render the button
        window.paypal.HostedButtons({
          hostedButtonId: "47SW4TJJB2GTU"
        }).render("#paypal-container-47SW4TJJB2GTU");
      } catch (error) {
        console.error("Error rendering PayPal button:", error);
      }
    }
  }, [isModalOpen, scriptLoaded, paymentMode]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsModalOpen(true)}
        className="text-green-500 hover:bg-green-500/10 rounded-full"
      >
        <DollarSign className="h-5 w-5" />
      </Button>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] rounded-2xl max-w-md w-full p-6 relative">
            {/* Close button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white z-10"
            >
              ×
            </button>

            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white text-center">Support Our Project</h2>
              
              {/* Payment Mode Toggle - Updated to match image */}
              <div className="flex rounded-full overflow-hidden border border-gray-700 bg-[#1e1e1e]">
                <button 
                  className={`flex-1 py-2 px-4 text-center transition-colors ${
                    paymentMode === 'international' 
                      ? 'bg-green-600 text-white font-medium' 
                      : 'bg-transparent text-gray-300 hover:bg-gray-800'
                  }`}
                  onClick={() => setPaymentMode('international')}
                >
                  International
                </button>
                <button 
                  className={`flex-1 py-2 px-4 text-center transition-colors ${
                    paymentMode === 'india' 
                      ? 'bg-green-600 text-white font-medium' 
                      : 'bg-transparent text-gray-300 hover:bg-gray-800'
                  }`}
                  onClick={() => setPaymentMode('india')}
                >
                  India
                </button>
              </div>
              
              {/* PayPal Option - International */}
              {paymentMode === 'international' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white text-center">Support via PayPal</h3>
                  
                  <div className="mt-4 min-h-[150px]">
                    <div id="paypal-container-47SW4TJJB2GTU"></div>
                    
                    <Script
                      src="https://www.paypal.com/sdk/js?client-id=BAAtrayj--_8bAXGLUKCOv5_RBC4zMlJy6vpDnxMjYNF_yIj_v0-8ijFE1LZ7cAYkhQC_Dw8cRfHrIfjpo&components=hosted-buttons&disable-funding=venmo&currency=USD"
                      strategy="lazyOnload"
                      onLoad={() => setScriptLoaded(true)}
                    />
                  </div>
                </div>
              )}
              
              {/* Indian Payment Option */}
              {paymentMode === 'india' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white text-center">Indian Payment Option</h3>
                  
                  <div className="flex justify-center mt-4 min-h-[150px]">
                    <a href="#" className="block hover:opacity-90 transition-opacity">
                      <Image
                        src="/assets/gpay_gsoc_link.jpg"
                        alt="Google Pay Payment Option"
                        width={250}
                        height={150}
                        className="rounded-lg"
                      />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function SocialButtons() {
  return (
    <div className="flex items-center space-x-2">
      <a 
        href="https://x.com/sreehariX" 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-gray-300 hover:text-white transition-colors"
      >
        <Button variant="ghost" size="icon" className="rounded-full">
          <XLogo />
        </Button>
      </a>
      
      <a 
        href="https://github.com/sreehariX/gsoc-projectRecommendation" 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-gray-300 hover:text-white transition-colors"
      >
        <Button variant="ghost" size="icon" className="rounded-full">
          <Github className="h-5 w-5" />
        </Button>
      </a>
      
      <a 
        href="https://www.linkedin.com/in/sreeharix/" 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-gray-300 hover:text-white transition-colors"
      >
        <Button variant="ghost" size="icon" className="rounded-full">
          <Linkedin className="h-5 w-5" />
        </Button>
      </a>
    </div>
  );
} 