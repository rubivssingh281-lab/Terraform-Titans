package com.example.config;

import org.openqa.selenium.By;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.util.Properties;

/**
 * DevOps Centralized Object Repository Reader for selenium_tests.
 */
public class LocatorReader {

    private static final Properties locators = new Properties();
    private static final String DEFAULT_LOCATOR_FILE = "locator.properties";
    private static boolean isLoaded = false;

    static {
        loadLocators();
    }

    private static synchronized void loadLocators() {
        if (isLoaded) return;

        try (InputStream input = LocatorReader.class.getClassLoader().getResourceAsStream(DEFAULT_LOCATOR_FILE)) {
            if (input != null) {
                locators.load(input);
                isLoaded = true;
                return;
            }
        } catch (Exception ignored) {}

        String[] fallbackPaths = new String[] {
            "src/test/resources/" + DEFAULT_LOCATOR_FILE,
            "src/main/resources/" + DEFAULT_LOCATOR_FILE,
            "selenium_tests/src/test/resources/" + DEFAULT_LOCATOR_FILE,
            "selenium_tests/src/main/resources/" + DEFAULT_LOCATOR_FILE
        };

        for (String path : fallbackPaths) {
            File file = new File(path);
            if (file.exists()) {
                try (FileInputStream fis = new FileInputStream(file)) {
                    locators.load(fis);
                    isLoaded = true;
                    return;
                } catch (Exception ignored) {}
            }
        }
    }

    public static String get(String key) {
        String sysProp = System.getProperty(key);
        if (sysProp != null && !sysProp.isBlank()) {
            return sysProp.trim();
        }
        String value = locators.getProperty(key);
        if (value == null) {
            throw new IllegalArgumentException("[LocatorReader] Locator key not found: '" + key + "' in locator.properties");
        }
        return value.trim();
    }

    public static String get(String key, Object... args) {
        return String.format(get(key), args);
    }

    public static By getBy(String key) {
        return parseBy(get(key));
    }

    public static By getBy(String key, Object... args) {
        return parseBy(get(key, args));
    }

    private static By parseBy(String locator) {
        if (locator.startsWith("xpath:")) {
            return By.xpath(locator.substring("xpath:".length()).trim());
        } else if (locator.startsWith("css:")) {
            return By.cssSelector(locator.substring("css:".length()).trim());
        } else if (locator.startsWith("id:")) {
            return By.id(locator.substring("id:".length()).trim());
        } else if (locator.startsWith("name:")) {
            return By.name(locator.substring("name:".length()).trim());
        } else if (locator.startsWith("class:")) {
            return By.className(locator.substring("class:".length()).trim());
        } else if (locator.startsWith("tag:")) {
            return By.tagName(locator.substring("tag:".length()).trim());
        }
        return By.xpath(locator);
    }
}
