// Firebase web config of the cloud backup (Firebase console > Project settings > Your apps > Web app "Askari").
// These values are not secrets: they only name the project. The Firestore rules decide who reads what (each user, their own data):
//   match /users/{userId}/{document=**} { allow read, write: if request.auth != null && request.auth.uid == userId; }
// With an empty apiKey the cloud backup is off and the app works as before.
export const firebaseConfig = {
  apiKey: 'AIzaSyCgkSGH4IWeZk8ujCJVy2Nry2mSd5E8OFU',
  authDomain: 'askari-backup.firebaseapp.com',
  projectId: 'askari-backup',
  appId: '1:605886609125:web:83dfeb9ee25b0d7935c60c',
};
