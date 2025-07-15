import adapter from '@sveltejs/adapter-static';

const dev = process.argv.includes('dev');

/** @type {import('@sveltejs/kit').Config} */
const config = {
    kit: {
        adapter: adapter({
            pages: 'docs',
            assets: 'docs',
            fallback: null,
            precompress: false,
            strict: true
        }),
        paths: {
            base: dev ? '' : '/population-pointillism'  // Updated to match your new repo name
        }
    }
};

export default config;