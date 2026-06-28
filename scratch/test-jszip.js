import JSZip from 'jszip';
console.log("JSZip loaded successfully.");
const zip = new JSZip();
zip.file("empty.jpg", "");
zip.file("real.jpg", "hello");
const emptyFile = zip.file("empty.jpg");
const realFile = zip.file("real.jpg");
console.log("emptyFile properties:", Object.keys(emptyFile));
console.log("realFile properties:", Object.keys(realFile));
emptyFile.async("uint8array").then(data => {
    console.log("emptyFile length:", data.length);
});
realFile.async("uint8array").then(data => {
    console.log("realFile length:", data.length);
});
