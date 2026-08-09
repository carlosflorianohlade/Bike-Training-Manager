# Bike Training Manager

A full-stack web application for cyclists to log, analyze, and manage their training activities across MTB, road, gravel, and indoor disciplines.

Built as an academic project for the "Web Programming" course.

## Features

- **User authentication** — Register, login, and logout with JWT-based authentication stored in httpOnly cookies
- **Training log** — Full CRUD for bike workouts with distance, duration, elevation gain, heart rate, cadence, and notes
- **Smart filters** — Search by text, filter by discipline and date range, sort by any column
- **Dashboard** — Summary statistics (total distance, hours, elevation, average per ride, last ride) and recent activity at a glance
- **Statistics & charts** — Monthly bar charts for distance, duration, and elevation; pie chart for discipline distribution (Google Charts)
- **Goal tracking** — Set monthly or yearly targets for distance, duration, or elevation with real-time progress bars
- **Profile management** — Edit personal info (name, weight, height, preferred discipline) and change password
- **Responsive design** — Mobile-first layout that adapts from desktop to small screens

## Tech Stack

| Layer          | Technology                                      |
| -------------- | ----------------------------------------------- |
| Frontend       | HTML5, CSS3, Vanilla JavaScript, Google Charts  |
| Backend        | Node.js, Express 5                              |
| Database       | MySQL (mysql2)                                  |
| Authentication | JWT (jsonwebtoken), bcrypt                      |
| Icons          | FontAwesome 6                                   |

## Database Schema

The application uses a MySQL database with three tables:

### `users`
| Column              | Type         | Description                        |
| ------------------- | ------------ | ---------------------------------- |
| id                  | INT (PK)     | Unique user identifier             |
| first_name          | VARCHAR(50)  | User's first name                  |
| last_name           | VARCHAR(50)  | User's last name                   |
| email               | VARCHAR(100) | Login email (unique)               |
| password_hash       | VARCHAR(255) | bcrypt-hashed password             |
| weight              | DECIMAL      | Weight in kg (optional)            |
| height              | DECIMAL      | Height in cm (optional)            |
| preferred_discipline| ENUM         | MTB / strada / gravel / indoor     |
| created_at          | TIMESTAMP    | Registration date                  |

### `trainings`
| Column        | Type     | Description                         |
| ------------- | -------- | ----------------------------------- |
| id            | INT (PK) | Unique training identifier          |
| user_id       | INT (FK) | Owner (references users)            |
| title         | VARCHAR  | Descriptive title                   |
| training_date | DATE     | Date of the ride                    |
| type          | ENUM     | MTB / strada / gravel / indoor      |
| distance      | DECIMAL  | Distance in km                      |
| duration      | INT      | Duration in minutes                 |
| elevation_gain| INT      | Positive elevation in meters        |
| avg_speed     | DECIMAL  | Average speed in km/h               |
| avg_hr        | INT      | Average heart rate (bpm)            |
| max_hr        | INT      | Maximum heart rate (bpm)            |
| cadence       | INT      | Average cadence (rpm)               |
| notes         | TEXT     | Free-text notes                     |
| created_at    | TIMESTAMP| Creation date                       |
| updated_at    | TIMESTAMP| Last modification date              |

### `goals`
| Column      | Type     | Description                           |
| ----------- | -------- | ------------------------------------- |
| id          | INT (PK) | Unique goal identifier                |
| user_id     | INT (FK) | Owner (references users)              |
| type        | ENUM     | distance / duration / elevation       |
| target_value| DECIMAL  | Target value to reach                 |
| period      | ENUM     | monthly / yearly                      |
| year        | INT      | Reference year                        |
| month       | INT      | Reference month (only for monthly)    |
| created_at  | TIMESTAMP| Creation date                         |

> Goal progress is computed on-the-fly by aggregating the corresponding fields from the `trainings` table within the target period. All queries use parameterized prepared statements to prevent SQL injection. `ON DELETE CASCADE` ensures that deleting a user removes all their associated trainings and goals.

## Pages Overview

### Public Pages (no authentication required)
| Page         | Description                                              |
| ------------ | -------------------------------------------------------- |
| `index.html` | Landing page with hero section, feature cards, CTA       |
| `login.html` | Login form (email + password)                            |
| `register.html` | Registration form (name, email, password, confirmation) |

### Private Pages (authentication required)
| Page             | Description                                                  |
| ---------------- | ------------------------------------------------------------ |
| `dashboard.html` | Summary stats, goals with progress bars, recent trainings     |
| `trainings.html` | Full training table with search, filters, sort, CRUD modal    |
| `statistics.html`| Google Charts visualizations (monthly bars + type pie chart)  |
| `profile.html`   | Edit personal data, change password, logout                   |

## Getting Started

### Prerequisites
- Node.js (v18 or later)
- MySQL server

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/bike-training-manager.git
   cd bike-training-manager
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create the MySQL database and tables:
   ```bash
   mysql -u root -p < schema.sql
   ```

4. Configure database credentials in `server/db.js`:
   ```js
   const pool = mysql.createPool({
       host: 'localhost',
       user: 'bike_user',
       password: 'bike_password',
       database: 'bike_training',
       // ...
   });
   ```

5. (Optional) Set a custom JWT secret via environment variable:
   ```bash
   export JWT_SECRET='your-custom-secret'
   ```

6. Start the server:
   ```bash
   npm start
   ```
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

7. Open `http://localhost:3000` in your browser.

## Design

- **Color palette**: Forest green tones (#2D6A4F, #40916C, #95D5B2) with a warm orange accent (#E76F51)
- **Typography**: System font stack (Segoe UI, Tahoma, Geneva, Verdana, sans-serif)
- **Icons**: FontAwesome 6 for UI elements and discipline badges
- **Layout**: Single-column responsive layout with CSS Grid and Flexbox
- **Animations**: Subtle fade-in effects, hover transitions on cards and buttons

## Academic Context

This project was developed as part of a university "Web Programming" course to demonstrate:
- Full-stack web development with Node.js and MySQL
- REST API design and implementation
- Client-server authentication flow (JWT)
- CRUD operations with relational databases
- Responsive frontend design with vanilla JavaScript
- Data visualization with charting libraries

**Status**: Academic project — not production-ready. Contributions and feedback are welcome.

## License

ISC