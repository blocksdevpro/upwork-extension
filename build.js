const esbuild = require('esbuild');
const path = require('path');

const isWatch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: ['src/scripts/content.ts'],
  bundle: true,
  outfile: 'dist/src/scripts/content.js',
  platform: 'browser',
  target: 'es2020',
  format: 'iife',
  sourcemap: false,
  minify: true,
  treeShaking: true,
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  banner: {
    js: '// Upwork Extension Content Script - Bundled with esbuild'
  }
};

async function build() {
  try {
    if (isWatch) {
      console.log('👀 Watching for changes...');
      const ctx = await esbuild.context(buildOptions);
      await ctx.watch();
    } else {
      console.log('🔨 Building...');
      await esbuild.build(buildOptions);
      console.log('✅ Build complete!');
    }
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();
