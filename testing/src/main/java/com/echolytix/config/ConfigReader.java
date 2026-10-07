package com.echolytix.config;

import java.io.InputStream;
import java.util.Properties;

public class ConfigReader {
    private static Properties properties = new Properties();

    static {
        try (InputStream input = ConfigReader.class.getClassLoader().getResourceAsStream("config.properties")) {
            if (input != null) {
                properties.load(input);
            } else {
                System.err.println("Warning: config.properties not found in classpath. Using defaults.");
            }
        } catch (Exception e) {
            System.err.println("Error loading config.properties: " + e.getMessage());
        }
    }

    public static String getProperty(String key, String defaultValue) {
        String sysProp = System.getProperty(key);
        if (sysProp != null && !sysProp.isBlank()) {
            return sysProp;
        }
        return properties.getProperty(key, defaultValue);
    }

    public static String getAppUrl() {
        return getProperty("app.url", "http://localhost:3000");
    }

    public static String getBrowser() {
        return getProperty("browser", "chrome");
    }

    public static boolean isHeadless() {
        return Boolean.parseBoolean(getProperty("headless", "false"));
    }

    public static int getImplicitTimeout() {
        return Integer.parseInt(getProperty("timeout.implicit", "10"));
    }

    public static int getExplicitTimeout() {
        return Integer.parseInt(getProperty("timeout.explicit", "15"));
    }

    public static String getUserEmail() {
        return getProperty("user.email", "Sachingupta@gmail.com");
    }

    public static String getUserPassword() {
        return getProperty("user.password", "123456789");
    }
}
