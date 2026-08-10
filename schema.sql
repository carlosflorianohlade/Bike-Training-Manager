CREATE DATABASE IF NOT EXISTS bike_training;
USE bike_training;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    weight DECIMAL(4,1),
    height DECIMAL(4,1),
    lthr INT DEFAULT NULL,
    preferred_discipline ENUM('MTB','strada','gravel','indoor') DEFAULT 'MTB',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE trainings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(100) NOT NULL,
    training_date DATE NOT NULL,
    type ENUM('MTB','strada','gravel','indoor') NOT NULL,
    distance DECIMAL(8,2),
    duration INT,
    elevation_gain INT,
    avg_speed DECIMAL(4,1),
    avg_hr INT,
    max_hr INT,
    cadence INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE training_zone_times (
    id INT AUTO_INCREMENT PRIMARY KEY,
    training_id INT NOT NULL,
    zone_code VARCHAR(5) NOT NULL,
    seconds INT NOT NULL DEFAULT 0,
    FOREIGN KEY (training_id) REFERENCES trainings(id) ON DELETE CASCADE,
    UNIQUE KEY (training_id, zone_code)
);

CREATE TABLE goals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('distance','duration','elevation') NOT NULL,
    target_value DECIMAL(10,2) NOT NULL,
    period ENUM('monthly','yearly') NOT NULL,
    year INT NOT NULL,
    month INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
