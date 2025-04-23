export const safeJsonArray = (input) => {
    if (!input || typeof input !== 'string') return [];

    try {
        // Fix keys (for ep), add quotes if needed
        let fixed = input;

        // Add quotes around object keys (for `ep`)
        if (fixed.includes('{') && !fixed.includes('"episode"')) {
            fixed = fixed.replace(/([{,])(\s*\w+\s*):/g, '$1"$2":');
        }

        // Fix unquoted date values (optional)
        fixed = fixed.replace(/"created_date":\s*([\d-:\s]+)/g, (_, date) => `"created_date":"${date.trim()}"`);

        return JSON.parse(fixed);
    } catch (err) {
        console.error("[Parse Error] Invalid JSON in DB:", input);
        return [];
    }
}  