export const log = {
  info: (message: string, meta?: unknown) => {
    if (meta) {
      console.log(`[INFO] ${message}`, meta);
      return;
    }
    console.log(`[INFO] ${message}`);
  },
  error: (message: string, meta?: unknown) => {
    if (meta) {
      console.error(`[ERROR] ${message}`, meta);
      return;
    }
    console.error(`[ERROR] ${message}`);
  }
};
