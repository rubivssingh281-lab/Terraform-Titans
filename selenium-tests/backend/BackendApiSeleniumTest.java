import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;

public class BackendApiSeleniumTest {
    public static void main(String[] args) {
        System.out.println("Starting the tests...\n");
        int result = 10 + 5;
        if (result == 15) {
            System.out.println("Test 1: Basic Math Test - PASSED");
        } else {
            System.out.println("Test 1: Basic Math Test - FAILED");
        }

        String userInput = "   Student@COLLEGE.edu   ";
        String expectedOutput = "student@college.edu";
        String actualOutput = cleanEmail(userInput);
        
        if (actualOutput.equals(expectedOutput)) {
            System.out.println("Test 2: Helper Function cleanEmail - PASSED");
        } else {
            System.out.println("Test 2: Helper Function cleanEmail - FAILED");
        }

        System.out.println("\nStarting Selenium browser to test Backend API...");
        WebDriver driver = new ChromeDriver();
        try {
            String apiUrl = "http://localhost:3000/api/quick-phrases";
            driver.get(apiUrl);
            
            Thread.sleep(2000);
            
            String pageText = driver.findElement(By.tagName("body")).getText();
            
            if (pageText.contains("[") && pageText.contains("label")) {
                System.out.println("Test 3: Real Backend API Test (Quick Phrases) - PASSED");
            } else {
                System.out.println("Test 3: Real Backend API Test (Quick Phrases) - FAILED");
                System.out.println("The API returned: " + pageText);
            }
            
        } catch (Exception e) {
            System.out.println("An error occurred while running the Selenium test: ");
            e.printStackTrace();
        } finally {
            driver.quit();
            System.out.println("\nSelenium browser closed. Tests finished.");
        }
    }
    public static String cleanEmail(String email) {
        String trimmedEmail = email.trim();
        String lowerCaseEmail = trimmedEmail.toLowerCase();
        return lowerCaseEmail;
    }
}
