interface User {
  id: number;
  username: string;
}

export const base = "https://gitpd.paodingai.com";

export function get_today(): string {
  const date = new Date();
  // 获取年份
  const year = date.getFullYear();

  // 获取月份，注意月份是从0开始的，所以要加1
  let month: string | number = date.getMonth() + 1;

  // 获取日期
  let day: string | number = date.getDate();

  // 如果月份或日期小于10，要在前面补0
  if (month < 10) {
    month = "0" + month;
  }
  if (day < 10) {
    day = "0" + day;
  }

  // 拼接成yyyy-MM-dd的格式
  const formattedDate = year + "-" + month + "-" + day;

  // 返回格式化后的日期
  return formattedDate;
}

export async function get_current_user(token: string): Promise<User> {
  const response = await fetch(`${base}/api/v4/user`, {
    headers: {
      Accept: "application/json, application/xml, text/plain, text/html, *.*",
      "Content-Type": "application/json; charset=utf-8",
      "PRIVATE-TOKEN": token,
    },
    credentials: "include",
  });
  if (response.status !== 200) {
    throw new Error("Get Current User Failed");
  }
  return (await response.json()) as User;
}
