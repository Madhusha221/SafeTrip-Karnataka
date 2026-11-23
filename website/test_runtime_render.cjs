const React = require('react');
const ReactDOMServer = require('react-dom/server');
const esbuild = require('esbuild');
const fs = require('fs');

async function testRender() {
  const result = await esbuild.build({
    entryPoints: ['src/App.jsx'],
    bundle: true,
    write: false,
    format: 'cjs',
    loader: { '.js': 'jsx', '.jsx': 'jsx' },
    external: ['react', 'react-dom', 'leaflet', 'react-leaflet']
  });

  const code = result.outputFiles[0].text;
  fs.writeFileSync('temp_bundle.cjs', code);

  try {
    const AppModule = require('./temp_bundle.cjs');
    const App = AppModule.default || AppModule;
    const html = ReactDOMServer.renderToString(React.createElement(App));
    console.log('RENDER SUCCESS! HTML Length:', html.length);
  } catch (err) {
    console.error('RUNTIME RENDER ERROR:', err);
  } finally {
    if (fs.existsSync('temp_bundle.cjs')) fs.unlinkSync('temp_bundle.cjs');
  }
}

testRender();
