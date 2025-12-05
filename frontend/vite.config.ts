import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

/**
 * Plugin to validate VITE_API_BASE_URL during production builds
 * Ensures the environment variable is set and not using localhost fallback
 */
function validateApiBaseUrl(): Plugin {
  let isProduction = false;
  
  return {
    name: 'validate-api-base-url',
    configResolved(config) {
      // Detect if this is a production build
      isProduction = config.mode === 'production' || process.env.NODE_ENV === 'production';
    },
    buildStart() {
      // Only run validation in production builds
      if (isProduction) {
        const apiBaseUrl = process.env.VITE_API_BASE_URL;
        
        // Log ALL environment variables for diagnostic purposes
        console.log('\n🔍 Build-time Environment Variable Diagnostic:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`VITE_API_BASE_URL = ${apiBaseUrl || '(undefined)'}`);
        console.log('');
        console.log('📋 All VITE_* environment variables:');
        Object.keys(process.env)
          .filter(key => key.startsWith('VITE_'))
          .forEach(key => {
            const value = process.env[key];
            // Mask sensitive values but show structure
            const displayValue = key.includes('SECRET') || key.includes('KEY') 
              ? '(masked)' 
              : value || '(undefined)';
            console.log(`   ${key} = ${displayValue}`);
          });
        console.log('');
        console.log('📋 Checking for typo variable (VITE_APT_BASE_URL):');
        console.log(`   VITE_APT_BASE_URL = ${process.env.VITE_APT_BASE_URL || '(not found - good!)'}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        // Check if variable is missing or undefined
        if (!apiBaseUrl || apiBaseUrl === 'undefined' || apiBaseUrl.trim() === '') {
          console.error('\n❌ VITE_API_BASE_URL missing — production build aborted.');
          console.error('\n📋 Required Action:');
          console.error('   1. Go to Vercel Dashboard → Project → Settings → Environment Variables');
          console.error('   2. Add variable: VITE_API_BASE_URL');
          console.error('   3. Set value: https://restockednew-production.up.railway.app');
          console.error('   4. Ensure it\'s applied to Production environment\n');
          throw new Error('❌ VITE_API_BASE_URL missing — production build aborted.');
        }
        
        // Check if variable is set to localhost (development fallback)
        if (apiBaseUrl === 'http://localhost:3000' || apiBaseUrl.includes('localhost')) {
          console.error('\n❌ VITE_API_BASE_URL missing — production build aborted.');
          console.error(`   Current value: ${apiBaseUrl}`);
          console.error('   Error: Using localhost fallback in production build');
          console.error('\n📋 Required Action:');
          console.error('   1. Go to Vercel Dashboard → Project → Settings → Environment Variables');
          console.error('   2. Add/Update variable: VITE_API_BASE_URL');
          console.error('   3. Set value: https://restockednew-production.up.railway.app');
          console.error('   4. Ensure it\'s applied to Production environment\n');
          throw new Error('❌ VITE_API_BASE_URL missing — production build aborted.');
        }
        
        // Success message
        console.log('✅ VITE_API_BASE_URL validated successfully');
        console.log(`   Using: ${apiBaseUrl}\n`);
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig(() => {
  return {
    plugins: [
      react(),
      validateApiBaseUrl(), // Add validation plugin
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
