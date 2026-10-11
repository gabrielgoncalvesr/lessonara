const APP_ORIGIN='https://lessonara.mosaic-labs.co';
const UUID='[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}';
const roomPattern=new RegExp(`^/classroom/${UUID}/(schedule|appointment|makeup)/${UUID}/(\\d{4}-\\d{2}-\\d{2})$`,'i');
function validRoomPath(path){const match=path.match(roomPattern);if(!match)return false;const date=new Date(match[2]+'T12:00:00Z');return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===match[2];}
function deepLinkToUrl(value){try{const link=new URL(value);if(link.protocol!=='lessonara:'||link.hostname!=='classroom'||link.username||link.password||link.port||link.search||link.hash)return null;const path='/classroom'+link.pathname;return validRoomPath(path)?APP_ORIGIN+path:null;}catch{return null;}}
function isAppUrl(value){try{const url=new URL(value);return url.origin===APP_ORIGIN&&!url.username&&!url.password;}catch{return false;}}
function isMediaOrigin(value){try{return [APP_ORIGIN,'https://meet.mosaic-labs.co'].includes(new URL(value).origin);}catch{return false;}}
function isCallUrl(value){try{const u=new URL(value);return isAppUrl(value)&&!u.search&&!u.hash&&(u.pathname==='/calls'||validRoomPath(u.pathname));}catch{return false;}}
module.exports={APP_ORIGIN,validRoomPath,deepLinkToUrl,isCallUrl,isAppUrl,isMediaOrigin};
