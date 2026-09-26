// src/components/ImageSlider.js
import React, { useState, useEffect } from 'react';


const slides = [
  { image: '/images/slides/logo1.png', text: `“If you can’t fly, then run; if you can’t run, then walk; if you
          can’t walk, then crawl, but whatever you do, you have to keep moving
          forward.”` },
  { image: '/images/slides/logo2.jpg', text: `“Whatever the mind of man can conceive and believe, it can achieve.” - Napoleon Hill ` },
  { image: '/images/slides/logo3.jpg', text: `“Nothing is impossible, the word itself says 'I'm possible!”` },
];

const ImageSlider = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
    }, 3000); // Change slide every 3 seconds

    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  return (
    <div style={styles.container}>
      <div>
        <img src={slides[currentIndex].image} alt="slide" style={styles.image} />
      </div>
      <div style={styles.textContiner}>
        <h6 style={styles.text}>{slides[currentIndex].text}</h6>
      </div>
    </div>
  );
};

const styles = {
  container: {
    width: '200px',
    margin: '0 auto',
    textAlign: 'center',
  },
  image: {
    width: '110%',
    height: 'auto',
    
  },
  text: {
    marginTop: '10px',
    fontSize: '12px',
    color: '#333',
  },
  textContiner:{
    height:'100px'
  }
};

export default ImageSlider;
