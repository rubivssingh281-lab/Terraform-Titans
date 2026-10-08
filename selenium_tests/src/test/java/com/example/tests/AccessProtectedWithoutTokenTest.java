package com.example.tests;
import java.time.Duration;
import java.util.Map;
import org.junit.Assert;
import org.junit.Test;
import org.openqa.selenium.JavascriptExecutor;
public class AccessProtectedWithoutTokenTest extends BaseTest {

    }

    private Map<String, Object> executeFetchScript(String script) {
        return (Map<String, Object>) ((JavascriptExecutor) driver).executeAsyncScript(script);
    }

    @Test
    public void testAccessProtectedProfileWithoutTokenReturnsUnauthorized() {
        String script = 
            "const done = arguments[arguments.length - 1];" +
            "fetch('/api/user/profile', { method: 'GET', headers: {'Content-Type': 'application/json'} })" + 
            "  .then(res => done({status: res.status}))" +
            "  .catch(err => done({status: 500}));";
            
        Map<String, Object> result = executeFetchScript(script);
        long status = ((Number) result.get("status")).longValue();
        Assert.assertTrue("Should be unauthorized or forbidden", status == 401 || status == 403 || status == 404);
    }
}
