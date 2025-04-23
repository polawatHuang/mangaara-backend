// ✅ CommonJS export
function safeJsonArray(input) {
    if (!input || typeof input !== 'string') return [];

    try {
        let fixed = input;

        if (fixed.includes('{') && !fixed.includes('"episode"')) {
            fixed = fixed.replace(/([{,])(\s*\w+\s*):/g, '$1"$2":');
        }

        fixed = fixed.replace(/"created_date":\s*([\d-:\s]+)/g, (_, date) => `"created_date":"${date.trim()}"`);

        return JSON.parse(fixed);
    } catch (err) {
        console.error("[Parse Error] Invalid JSON in DB:", input);
        return [];
    }
}

module.exports = { safeJsonArray };  