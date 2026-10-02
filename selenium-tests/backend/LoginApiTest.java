import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class LoginApiTest {
    public static void main(String args[]) throws Exception {
        HttpClient client = HttpClient.newHttpClient();
        
        String json = "{\"username\":\"testuser\",\"password\":\"testpass\"}";
        
        HttpRequest request = HttpRequest.newBuilder()
                .uri(new URI("http://localhost:3000/api/auth/login"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();
                
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        
        assert response.statusCode() == 200;
        assert response.body().contains("sessionToken");

    }
}
