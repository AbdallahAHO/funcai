const funcai = require('funcai') as typeof import('funcai');
const openrouterProvider =
  require('funcai/providers/openrouter') as typeof import('funcai/providers/openrouter');

const ai = funcai.createAiFn({
  provider: openrouterProvider.openrouter({ apiKey: 'sk-test' }),
});

const content = [funcai.text('hello'), funcai.image('https://example.com/photo.jpg')];

void ai;
void content;
