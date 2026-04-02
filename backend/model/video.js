import mongoose from 'mongoose';


export default mongoose.model('Video', {
titel: String,
url: String
});