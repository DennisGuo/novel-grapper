const NodeCache = require( "node-cache" );
const myCache = new NodeCache( { stdTTL: 7200 } );

const set = (key,val)=>{
    myCache.set(key,val);
}
const get = (key)=>{
    return myCache.get(key);
}

module.exports = {
    set,
    get,
}

