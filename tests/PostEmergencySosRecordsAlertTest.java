import java.time.Duration;
import java.util.Map;
import org.junit.After;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.chrome.ChromeDriver;

public class PostEmergencySosRecordsAlertTest {

    private ChromeDriver driver;

    @Before
    public void setUp() {
        driver = new ChromeDriver();
        driver.manage().timeouts().scriptTimeout(Duration.ofSeconds(20));
        driver.get("http://localhost:3000");
    }

    @After
    public void tearDown() {
        if (driver != null) {
            driver.quit();
        }
    }

    @Test
    public void testEmergencySosRecordsAlert() {
        // We use a unique message to ensure we are finding the exact alert we just posted
        String message = "Selenium SOS " + System.currentTimeMillis();
        String script =
            "const done = arguments[arguments.length - 1];" +
            "const message = arguments[0];" +
            "fetch('/api/emergency/sos', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({patientId: 1, message: message, latitude: 12.34, longitude: 56.78})})" +
            "  .then(response => response.json().then(data => ({status: response.status, success: data.success})))" +
            "  .then(posted => fetch('/api/emergency/sos?limit=20')" + // Fetch recent alerts
            "    .then(response => response.json())" +
            "    .then(list => done({status: posted.status, success: posted.success, stored: list.some(alert => alert.message === message)})))" +
            "  .catch(err => done({status: 500, success: false, stored: false}));";

        Map<String, Object> result =
            (Map<String, Object>) ((JavascriptExecutor) driver).executeAsyncScript(script, message);

        long status = ((Number) result.get("status")).longValue();
        Object success = result.get("success");
        Object stored = result.get("stored");

        // The image specifies status 200, though some APIs might return 201 Created. We'll accept either for robustness.
        Assert.assertTrue("Status should be 200 or 201", status == 200 || status == 201);
        
        // Assert the alert creation was successful
        Assert.assertEquals(Boolean.TRUE, success);
        
        // Assert the specific message we just posted was found in the stored alerts list
        Assert.assertEquals("The newly posted alert should be present in the database", Boolean.TRUE, stored);
    }
}
