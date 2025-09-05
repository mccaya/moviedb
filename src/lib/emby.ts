interface EmbyAPI {
  checkConnection: () => Promise<boolean>;
  searchMovie: (tmdbId: number) => Promise<any>;
  getWebPlayerUrl: (itemId: string) => string;
}

export const embyAPI: EmbyAPI = {
  async checkConnection(): Promise<boolean> {
    // Placeholder implementation
    return false;
  },

  async searchMovie(tmdbId: number): Promise<any> {
    // Placeholder implementation
    return null;
  },

  getWebPlayerUrl(itemId: string): string {
    // Placeholder implementation
    return '';
  }
};