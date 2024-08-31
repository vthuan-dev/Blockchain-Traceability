import { PinataSDK } from "pinata";

const pinata = new PinataSDK({
  pinataJwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIyYWVhNGNjMi0xYzhmLTRlZGEtYTU4My1kMWY2M2I5YTY1MjQiLCJlbWFpbCI6InZ0aHVhbi5kZXZAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6Ijg0YjFhMjYwNmZiNzAxMzQ1NzY2Iiwic2NvcGVkS2V5U2VjcmV0IjoiZDEwMDFkMzJlODE0ZjI3YmQ5NzhjNWJmNGM5NDY0NGM0NGUwZTY1NGVmNzc4YTgyZTUxMmQ3OTgyZmNlNzY0OSIsImV4cCI6MTc1NjUyNDg2M30.I5F8rj1Y42QZs7qNvT3DpcqbitMMwZgQ0o6evdDGt80",
  pinataGateway: "example-gateway.mypinata.cloud",
});

async function main() {
  try {
    const file = new File(["hello"], "Testing.txt", { type: "text/plain" });
    const upload = await pinata.upload.file(file);
    console.log(upload);
  } catch (error) {
    console.log(error);
  }
}

await main();
