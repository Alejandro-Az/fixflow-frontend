// Configuración de Babel exclusiva para tests (Jest)
// No incluye el plugin de react-native-reanimated que falla en entorno Node
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    '@babel/preset-typescript',
  ],
};
