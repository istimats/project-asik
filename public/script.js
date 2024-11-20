async function getWeatherByLocation() {
    const apiKey = '7739664bedc9ddba0afd796156570b03';  // Masukkan API Key Anda di sini
    const weatherContainer = document.getElementById('weather');

    // Cek jika browser mendukung geolocation
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async position => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            try {
                const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=id`);
                const data = await response.json();

                if (data.cod === 200) {
                    const city = data.name;
                    const weatherDescription = data.weather[0].description;
                    const temp = data.main.temp;
                    const humidity = data.main.humidity;
                    const windSpeed = data.wind.speed;

                    weatherContainer.innerHTML = `
                        <h2>Cuaca di ${city}</h2>
                        <p><strong>${weatherDescription}</strong></p>
                        <p>Suhu: ${temp}°C</p>
                        <p>Kelembaban: ${humidity}%</p>
                        <p>Kecepatan Angin: ${windSpeed} m/s</p>
                    `;
                } else {
                    weatherContainer.innerHTML = 'Data cuaca tidak tersedia untuk lokasi ini.';
                }
            } catch (error) {
                weatherContainer.innerHTML = 'Gagal mengambil data cuaca, periksa koneksi Anda.';
            }
        }, () => {
            weatherContainer.innerHTML = 'Tidak bisa mengakses lokasi. Pastikan izin lokasi sudah diaktifkan!';
        });
    } else {
        weatherContainer.innerHTML = 'Geolocation tidak didukung di browser Anda.';
    }
}