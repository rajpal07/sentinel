
const now = new Date();
const currentTime = now.getHours() * 60 + now.getMinutes();
console.log('Current Date:', now.toString());
console.log('Current Time (minutes):', currentTime);
console.log('Current Hours:', now.getHours());
console.log('Current ISO:', now.toISOString());
