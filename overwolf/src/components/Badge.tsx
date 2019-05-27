import styled from "styled-components";

interface Props {
  customCSS: string;
}

const Badge = styled.div<Props>`
  align-items: center;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 1em;
  display: flex;
  font-size: 5vh;
  margin: 0.25rem;
  padding: 0.25rem 1rem;
  position: absolute;
  text-align: center;
  user-select: none;
  z-index: 1;

  ${props => props.customCSS}
`;

export default Badge;
