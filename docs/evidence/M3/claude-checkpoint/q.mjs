import { connect } from './cdp.mjs';
const c = await connect(); console.log(JSON.stringify(await c.ev(process.argv[2]))); c.close();
