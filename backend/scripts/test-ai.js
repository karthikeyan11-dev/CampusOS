const { summarizeNotification } = require('../src/services/ai.service');

async function testAI() {
  console.log('🤖 Testing AI Integration (Groq/LLaMA 3.3)...');
  try {
    const text = "Students are hereby informed that the end-semester examinations will commence from May 15th. Detailed timetables are available on the student portal. All students must clear their dues before May 1st to receive their hall tickets.";
    const summary = await summarizeNotification(text);
    console.log('✅ AI Summary Generated:');
    console.log('-------------------------');
    console.log(summary);
    console.log('-------------------------');
  } catch (err) {
    console.error('❌ AI Test Failed:', err.message);
  } finally {
    process.exit();
  }
}

testAI();
