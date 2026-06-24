const express = require("express");
const axios = require("axios");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

// Use a neutral JSDOM to create DOM elements for parsing RSS descriptions.
global.document = new JSDOM("<!DOCTYPE html>").window.document;
const router = express.Router();
// const key = process.env.NEWS_KEY || 'pub_5928a18d3b8bc5ca9ba7a30e20af0b5bcd';
// const url = `https://newsdata.io/api/1/news?apikey=${key}&country=in&category=sports&q=cricket`;

router.get("/news", async (req, res) => {
  try {
    const response = await axios.get(
      "https://timesofindia.indiatimes.com/rssfeeds/54829575.cms?feedtype=sjson"
    );

    const results = response.data.channel.item.map((article) => {
      const div = document.createElement("div");
      div.innerHTML = article.description || "";
      const imageTag = div.getElementsByTagName("img");

      let image = null;
      if (imageTag.length > 0) {
        image = imageTag[0].src;
        imageTag[0].parentNode.removeChild(imageTag[0]);
      }

      const description = div.innerHTML;

      let weekDate = "";
      let date = "";
      if (article.pubDate) {
        const dates = article.pubDate.split(",");
        weekDate = dates[0] || "";
        date = dates[1] || "";
      }

      return {
        title: article.title,
        image,
        description,
        weekDate,
        date,
      };
    });

    res.send({
      success: true,
      results,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

// let date = new Date();
// let prevResults = [];

// router.get('/news', (req, res) => {
//     const currDate = new Date();
//     const diffinMinutes = Math.ceil((currDate - date) / (1000 * 60));

//     if(diffinMinutes < 30 && prevResults.length > 0){
//         res.status(200).send({
//             results: prevResults
//         })
//         return;
//     }

//     axios.get(url)
//     .then((response) => {
//         const raw = response.data.results;
//         date = new Date();
//         const results = raw.filter((data) => {
//             if(data.image_url && data.image_url != null){
//                 return data;
//             }
//         })
//         prevResults = results;
//         res.status(200).send({results});
//     }).catch((error) => {
//         res.status(500).send({
//             success: false,
//             message: "Something went wrong on our side. Sorry for the inconvenience." + error.message
//         })
//     })
// })

module.exports = router;
