INSERT INTO public.user_roles (user_id, role)
VALUES ('11cb109f-36ac-44bd-8284-fe9ee0df1511', 'master')
ON CONFLICT (user_id, role) DO NOTHING;;
