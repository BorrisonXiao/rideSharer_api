-- Drop old tables is essential for the rebuild of the database
DROP TABLE IF EXISTS `driverTrips`;
DROP TABLE IF EXISTS `passengerTrips`;
DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `lastname` varchar(255) NOT NULL,
  `firstname` varchar(255) NOT NULL,
  `admin` tinyint(1) NOT NULL,
  `password` varchar(255) NOT NULL,
  `username` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `username` (`username`),
  KEY `lastname` (`lastname`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Note that under current design, the driverTrips and passengerTrips table are exactly the same.
-- This design allows each table to be extended, for instance, adding other unique features, e.g. car type, etc.
CREATE TABLE `driverTrips` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userid` int(11) NOT NULL,
  `pickupLocation` varchar(255) NOT NULL,
  `destination` varchar(255) NOT NULL,
  `price` float(10, 2) NOT NULL,
  `departureTime` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY (`userid`, `pickupLocation`, `destination`, `departureTime`),
  CONSTRAINT `driver_must_exist` FOREIGN KEY (`userid`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `passengerTrips` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userid` int(11) NOT NULL,
  `pickupLocation` varchar(255) NOT NULL,
  `destination` varchar(255) NOT NULL,
  `price` float(10, 2) NOT NULL,
  `departureTime` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY (`userid`, `pickupLocation`, `destination`, `departureTime`),
  CONSTRAINT `passenger_must_exist` FOREIGN KEY (`userid`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;