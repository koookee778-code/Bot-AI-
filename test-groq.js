const Groq = require("groq-sdk");

async function test() {
    const groq = new Groq({ apiKey: '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' });
    try {
        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: "Hello" }]
        });
        console.log("SUCCESS:", completion.choices[0].message.content);
    } catch (e) {
        console.error("ERROR:", e.message);
    }
}
test();
