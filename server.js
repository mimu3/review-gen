require('dotenv').config();
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const systemPrompt = `あなたはGoogleマップの口コミ文を書くプロのライターです。
以下のルールを必ず守ってください：

1. オノマトペ（もちもち・とろとろ・ふわっと・ぱりっと・こっくり・じゅわっと・
   なめらか・ほくほく・ぷりぷり・さくさく など）を積極的に使う
2. 食欲をそそるシズル感のある表現を盛り込む
3. 広告・PR感がなく、実際に行った人が書いたようにオーガニックな文体にする
4. ハッシュタグは使わない
5. 絵文字は1〜2個まで（使わなくてもOK）
6. 口コミ文のみ出力し、前置きや説明文は一切つけない`;

const modeInstruction = {
  default: '200〜270字程度で書いてください。',
  short:   '150字以内で簡潔に書いてください。',
  long:    '350字以上で詳しく書いてください。',
  ono:     'オノマトペ・擬音語を通常の3倍以上使って書いてください。',
  alt:     '200〜270字程度で、前回とは異なる表現・切り口で書いてください。',
};

app.post('/api/generate', async (req, res) => {
  const { shop, genre, dish, taste, vibe, value, rating, tone, mode } = req.body;

  if (!shop && !dish && !taste) {
    return res.status(400).json({ error: '店名・料理・感想のいずれか1つを入力してください。' });
  }

  const selectedMode = modeInstruction[mode] ? mode : 'default';

  const userPrompt = `
以下の情報をもとにGoogleマップの口コミ文を書いてください。

【お店情報】
店名：${shop || '未記入'}
ジャンル：${genre || '未記入'}
注文した料理：${dish || '未記入'}
食べた感想（食感・味・香り）：${taste || '未記入'}
雰囲気：${vibe || '未記入'}
コスパ感：${value || '未記入'}
評価：${rating ? rating + '点' : '未記入'}
文体トーン：${tone || 'テンション高め・楽しい'}

【文字数・スタイル指定】
${modeInstruction[selectedMode]}
`.trim();

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const review = response.content[0].text;
    res.json({ review });
  } catch (err) {
    console.error('Claude API error:', err);
    res.status(500).json({ error: 'レビュー生成に失敗しました。APIキーを確認してください。' });
  }
});

app.listen(port, () => {
  console.log(`口コミジェネレーター起動中 → http://localhost:${port}`);
});
