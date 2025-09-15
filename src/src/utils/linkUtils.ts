// Utility per la generazione di link che funziona sia in development che in produzione

export const getLinkUtils = () => {
  const isDevelopment = import.meta.env.DEV;
  const baseUrl = window.location.origin;
  
  // Log per debugging solo in development
  if (isDevelopment) {
    console.log('🌐 Link Utils - Base URL:', baseUrl);
    console.log('🔧 Environment:', import.meta.env.MODE);
  }

  return {
    baseUrl,
    isDevelopment,
    
    // Genera link per l'asta (partecipanti)
    getAuctionLink: (auctionId: string) => {
      const link = `${baseUrl}/asta/${auctionId}?participant=true`;
      if (isDevelopment) console.log('🔗 Auction Link:', link);
      return link;
    },
    
    // Genera link per display view
    getDisplayLink: (auctionId: string) => {
      const link = `${baseUrl}/asta/${auctionId}?view=display`;
      if (isDevelopment) console.log('📺 Display Link:', link);
      return link;
    },
    
    // Genera link per banditore
    getBanditoreLink: (auctionId: string) => {
      const link = `${baseUrl}/asta/${auctionId}?banditore=true`;
      if (isDevelopment) console.log('🔨 Banditore Link:', link);
      return link;
    },
    
    // Verifica se il link è valido
    isValidLink: (link: string) => {
      try {
        new URL(link);
        return true;
      } catch {
        return false;
      }
    }
  };
};

// Export default per backward compatibility
export default getLinkUtils;
