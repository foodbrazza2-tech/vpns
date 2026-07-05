import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [
        react(),
    ],
    server: {
        port: 5173,
        host: true,
        strictPort: false,
    },
    build: {
        target: 'ES2020',
        outDir: 'dist',
        sourcemap: false,
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true,
            },
        },
        rollupOptions: {
            output: {
                manualChunks: {
                    'vendor': ['react', 'react-dom'],
                    'supabase': ['@supabase/supabase-js'],
                },
            },
        },
    },
    optimizeDeps: {
        include: ['react', 'react-dom', '@supabase/supabase-js'],
    },
    test: {
        environment: 'jsdom',
        globals: true,
    },
});
