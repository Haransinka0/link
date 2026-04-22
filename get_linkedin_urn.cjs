const token = 'AQWISsVdG5CdFBoBvpaAEW30O47Rs19MPSLLH9YymqWHY9ygw-cC3TLr_aJgNkrXo9gg-DFF_EfKVNNVJjkhU2XyWSHuy-JrKHItVVFbF5htDi20Ui0Fwwr_x2jxX7DHYIC14WHD9UfbIK5X2OfFnn0i65fuimDU8LocGulePVdkr8p0GVz_64pPyw7D3WNmjapi_BgkjTHIJFp4w8EwxCn29NGRs80mDuglj6Vf7v_TY1_1ZFS8U5M87yKK7BSApm4_erdA_ILf49YyrLWA_NnHq-0b-AKFWIW3BP_yxtVZtuXKJoCPzwqjP96RIzog5c2dv2A383SevZc79_krp5FQqZZpww';

async function getUserInfo() {
  try {
    const res = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}

getUserInfo();
