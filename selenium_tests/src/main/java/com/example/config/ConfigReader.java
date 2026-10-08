package com.example.config;

import java.io.FileInputStream;
import java.io.IOException;
import java.util.Properties;

public class ConfigReader {
    private static Properties properties;

    public static Properties initProperties() {
        properties = new Properties();
        try {
            FileInputStream ip = new FileInputStream("src/test/resources/config.properties");
            properties.load(ip);
        } catch (IOException e) {
            e.printStackTrace();
        }
        return properties;
    }
}
