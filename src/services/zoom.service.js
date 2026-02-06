// const axios = require("axios");

// const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID;
// const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
// const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;

// /**
//  * 🔐 Generate Zoom Access Token
//  */
// async function getZoomAccessToken() {
//     try {
//         const response = await axios.post(
//             `https://zoom.us/oauth/token`,
//             null,
//             {
//                 params: {
//                     grant_type: "account_credentials",
//                     account_id: ZOOM_ACCOUNT_ID,
//                 },
//                 auth: {
//                     username: ZOOM_CLIENT_ID,
//                     password: ZOOM_CLIENT_SECRET,
//                 },
//             }
//         );

//         return response.data.access_token;
//     } catch (err) {
//         console.error("⚠️ Zoom Token Error:", err.response?.data || err.message);
//         throw new Error("Failed to get Zoom access token");
//     }
// }

// /**
//  * 🎥 Create Zoom Meeting (auto end & expire in 5 min)
//  */
// async function createZoomMeeting(topic = "Welcome Meeting") {
//     const token = await getZoomAccessToken();

//     const startTime = new Date();
//     const endTime = new Date(startTime.getTime() + 3 * 60000); // +5 minutes

//     const meetingPayload = {
//         topic,
//         type: 2, // scheduled meeting
//         start_time: startTime.toISOString(),
//         duration: 3, // auto end after 5 min
//         timezone: "UTC",
//         settings: {
//             host_video: true,
//             participant_video: true,
//             join_before_host: true,
//             waiting_room: false,
//             mute_upon_entry: true,
//         },
//     };

//     try {
//         // ✅ Create meeting
//         const response = await axios.post(
//             `https://api.zoom.us/v2/users/me/meetings`,
//             meetingPayload,
//             {
//                 headers: {
//                     Authorization: `Bearer ${token}`,
//                     "Content-Type": "application/json",
//                 },
//             }
//         );

//         const meeting = response.data;

//         console.log(`✅ Zoom meeting created (ID: ${meeting.id})`);

//         // ⏳ Auto delete meeting (and invalidate link) after 5 minutes
//         setTimeout(async () => {
//             try {
//                 // First end the meeting (forces all users out)
//                 await axios.put(
//                     `https://api.zoom.us/v2/meetings/${meeting.id}/status`,
//                     { action: "end" },
//                     {
//                         headers: {
//                             Authorization: `Bearer ${token}`,
//                             "Content-Type": "application/json",
//                         },
//                     }
//                 );

//                 console.log(`🚪 Meeting ${meeting.id} ended automatically after 3 minutes`);

//                 // Then delete meeting (makes link invalid)
//                 await axios.delete(`https://api.zoom.us/v2/meetings/${meeting.id}`, {
//                     headers: {
//                         Authorization: `Bearer ${token}`,
//                     },
//                 });

//                 console.log(`🗑️ Meeting ${meeting.id} deleted — link expired`);
//             } catch (deleteErr) {
//                 console.error("⚠️ Auto end/delete failed:", deleteErr.response?.data || deleteErr.message);
//             }
//         }, 3 * 60 * 1000); // 5 minutes

//         // Return meeting info
//         return {
//             meeting_id: meeting.id,
//             join_url: meeting.join_url,
//             start_url: meeting.start_url,
//             expiresAt: endTime.toISOString(),
//         };
//     } catch (err) {
//         console.error("⚠️ Zoom Meeting Create Error:", err.response?.data || err.message);
//         throw new Error("Zoom meeting creation failed");
//     }
// }

// module.exports = { createZoomMeeting };

// utils/zoomToken.js

const axios = require("axios");

const getZoomAccessToken = async () => {
  const auth = Buffer.from(
    `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
  ).toString("base64");

  const response = await axios.post(
    "https://zoom.us/oauth/token",
    null, // ❌ body EMPTY
    {
      params: {
        grant_type: "account_credentials",
        account_id: process.env.ZOOM_ACCOUNT_ID,
      },
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded", // 🔥 MUST
      },
    }
  );

  return response.data.access_token;
};

async function createZoomMeeting(topic = "Welcome Meeting") {
  const token = await getZoomAccessToken();

  const startTime = new Date();
  startTime.setMinutes(startTime.getMinutes() + 1); 

  const meetingPayload = {
    topic,
    type: 2, 
    start_time: startTime.toISOString(),
    duration: 30, 
    timezone: "Asia/Kolkata",
    settings: {
      host_video: true,
      participant_video: true,
      join_before_host: false,
      waiting_room: false,
      mute_upon_entry: true,
      approval_type: 0,
    },
  };

  const response = await axios.post(
    "https://api.zoom.us/v2/users/me/meetings",
    meetingPayload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );

  return {
    meetingId: response.data.id,
    joinUrl: response.data.join_url,
    startUrl: response.data.start_url,
    password: response.data.password,
  };
}


module.exports = { getZoomAccessToken, createZoomMeeting };
