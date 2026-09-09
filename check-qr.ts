import QRCode from 'qrcode';
QRCode.toDataURL("test").then(r => console.log(r)).catch(e => console.error(e));
