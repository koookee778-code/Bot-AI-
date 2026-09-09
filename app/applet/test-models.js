import Groq from "groq-sdk";
const groq = new Groq({ apiKey: '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' });
async function run() {
    try {
        const mdls = await groq.models.list();
        console.log(mdls.data.map(m => m.id).join(', '));
    } catch(e) {
        console.error(e.message);
    }
}
run();
