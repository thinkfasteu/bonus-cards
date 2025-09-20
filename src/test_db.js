"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("./db");
(async () => {
    try {
        const now = await (0, db_1.dbHealth)();
        console.log('DB OK, server time:', now);
    }
    catch (err) {
        console.error('DB error:', err);
    }
    finally {
        await (0, db_1.closeDb)();
    }
})();
