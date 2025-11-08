import "./SignUp.css";
import { useState } from "react";
import BackgroundBlur from "../assets/backgroud_blur.png";

function SignUp() {
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    phone: "",
    nickname: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleVerifyEmail = () => {
    console.log("이메일 인증 요청:", formData.email);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("회원가입 데이터:", formData);
  };

  return (
    <div className="signup-page">
      <div className="signup-bg" aria-hidden="true">
        <img src={BackgroundBlur} alt="blurred background" />
      </div>

      <form className="modal-content" onSubmit={handleSubmit}>
        <div className="modal-header">
          <h1>회원가입</h1>
        </div>

        <div className="modal-fields">
          <span className="section-divider">로그인 정보</span>

          <label className="signup-label">이메일</label>
          <div className="email-inline">
            <input
              className="signup-input"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
            <button
              type="button"
              className="verify-btn"
              onClick={handleVerifyEmail}
            >
              인증
            </button>
          </div>

          <label className="signup-label">비밀번호</label>
          <input
            className="signup-input"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />

          <label className="signup-label">비밀번호 확인</label>
          <input
            className="signup-input"
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />

          <span className="section-divider">회원 정보</span>

          <label className="signup-label">회원 유형</label>
          <div className="member-type">
            <button type="button" className="type-btn active">
              개인
            </button>
            <button type="button" className="type-btn">
              기업
            </button>
          </div>

          <label className="signup-label">이름</label>
          <input
            className="signup-input"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />

          <label className="signup-label">전화번호</label>
          <input
            className="signup-input"
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
          />

          <label className="signup-label">닉네임</label>
          <input
            className="signup-input"
            type="text"
            name="nickname"
            value={formData.nickname}
            onChange={handleChange}
            required
          />

          <button type="submit" className="submit-btn">
            가입하기
          </button>
        </div>
      </form>
    </div>
  );
}

export default SignUp;
