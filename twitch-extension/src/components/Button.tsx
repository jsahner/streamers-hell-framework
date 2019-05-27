import styled from "styled-components";

interface IProps {
  chosen?: boolean;
}

const Button = styled.button<IProps>`
  background-color: ${props => (props.chosen ? "#1a936f" : "#042a2b")};
  border: none;
  border-radius: 0.25rem;
  box-shadow: 0 2px 2px rgba(0, 0, 0, 0.14);
  color: white;
  cursor: pointer;
  font-size: 1rem;
  margin-bottom: 0.25rem;
  padding: 0.5rem;
  transition: all 0.1s;
  width: 100%;

  :hover {
    background-color: ${props => (props.chosen ? "#136c52" : "#093a3e")};
  }
`;

export default Button;
